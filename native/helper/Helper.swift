// Teachya native helper.
//
// A tiny command-line tool bundled as a Tauri sidecar. It does the three things
// that are far easier in Swift than in Rust:
//
//   capture      Screenshot one display with ScreenCaptureKit, excluding the
//                Teachya overlay window so the frozen frame never contains our
//                own UI. Also reports the frontmost window's title.
//   ocr          Recognize text in an image with Apple Vision.
//   permissions  Check or request Screen Recording / Microphone access.
//
// Every command prints a single JSON object on stdout and exits 0, or prints an
// error message on stderr and exits 1.

import AppKit
import AVFoundation
import CoreGraphics
import Foundation
import ScreenCaptureKit
import Vision

// MARK: - Plumbing

func fail(_ message: String) -> Never {
    FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
    exit(1)
}

func emit(_ object: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: object),
          let text = String(data: data, encoding: .utf8)
    else { fail("Could not encode JSON output") }
    print(text)
}

struct Args {
    let command: String
    private let values: [String: String]

    init(_ argv: [String]) {
        command = argv.count > 1 ? argv[1] : ""
        var values: [String: String] = [:]
        var i = 2
        while i < argv.count {
            let key = argv[i]
            if key.hasPrefix("--") {
                let name = String(key.dropFirst(2))
                if i + 1 < argv.count, !argv[i + 1].hasPrefix("--") {
                    values[name] = argv[i + 1]
                    i += 2
                } else {
                    values[name] = "true"
                    i += 1
                }
            } else {
                i += 1
            }
        }
        self.values = values
    }

    subscript(_ key: String) -> String? { values[key] }
}

func displayID(at point: CGPoint) -> CGDirectDisplayID {
    var ids = [CGDirectDisplayID](repeating: 0, count: 16)
    var count: UInt32 = 0
    CGGetDisplaysWithPoint(point, 16, &ids, &count)
    return count > 0 ? ids[0] : CGMainDisplayID()
}

func writePNG(_ image: CGImage, to path: String) {
    let url = URL(fileURLWithPath: path)
    try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    guard let dest = CGImageDestinationCreateWithURL(url as CFURL, "public.png" as CFString, 1, nil) else {
        fail("Could not create image destination at \(path)")
    }
    CGImageDestinationAddImage(dest, image, nil)
    if !CGImageDestinationFinalize(dest) { fail("Could not write PNG to \(path)") }
}

// MARK: - capture

@available(macOS 14.0, *)
func capture(args: Args) async {
    guard let pointArg = args["point"], let out = args["out"] else {
        fail("capture requires --point X,Y and --out PATH")
    }
    let parts = pointArg.split(separator: ",").compactMap { Double($0) }
    guard parts.count == 2 else { fail("Bad --point") }
    let point = CGPoint(x: parts[0], y: parts[1])
    let excludeWindow = args["exclude-window"].flatMap { UInt32($0) }
    let frontPid = args["front-pid"].flatMap { Int32($0) }

    let content: SCShareableContent
    do {
        content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
    } catch {
        fail("Screen Recording permission is required. (\(error.localizedDescription))")
    }

    let did = displayID(at: point)
    guard let display = content.displays.first(where: { $0.displayID == did }) ?? content.displays.first else {
        fail("No display found")
    }

    let excluded = content.windows.filter { window in
        if let excludeWindow, window.windowID == excludeWindow { return true }
        // Never include any other window of the parent (Teachya) process either.
        return window.owningApplication?.processID == getppid()
    }

    // CGDisplayPixelsWide reports points on HiDPI displays; the display mode knows the real pixel size.
    let pixelsWide = CGDisplayCopyDisplayMode(display.displayID)?.pixelWidth ?? display.width
    let scale = max(1.0, Double(pixelsWide) / Double(display.width))

    let filter = SCContentFilter(display: display, excludingWindows: excluded)
    let config = SCStreamConfiguration()
    config.width = Int(Double(display.width) * scale)
    config.height = Int(Double(display.height) * scale)
    config.showsCursor = false
    config.captureResolution = .best
    config.pixelFormat = kCVPixelFormatType_32BGRA

    let image: CGImage
    do {
        image = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: config)
    } catch {
        fail("Screenshot failed: \(error.localizedDescription)")
    }
    writePNG(image, to: out)

    // Title of the frontmost window that belongs to the app that was active
    // before Teachya took focus. SCShareableContent lists windows front to back.
    var title: String? = nil
    var appName: String? = nil
    if let frontPid {
        if let window = content.windows.first(where: {
            $0.owningApplication?.processID == frontPid && $0.isOnScreen && $0.windowLayer == 0
        }) {
            title = window.title
            appName = window.owningApplication?.applicationName
        } else if let app = NSRunningApplication(processIdentifier: frontPid) {
            appName = app.localizedName
        }
    }

    emit([
        "path": out,
        "width": image.width,
        "height": image.height,
        "scale": scale,
        "display": [
            "x": display.frame.origin.x,
            "y": display.frame.origin.y,
            "width": display.width,
            "height": display.height,
        ],
        "app": appName ?? "",
        "title": title ?? "",
    ])
}

// MARK: - ocr

func ocr(args: Args) {
    guard let path = args["image"] else { fail("ocr requires --image PATH") }
    guard let nsImage = NSImage(contentsOfFile: path),
          let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil)
    else { fail("Could not read image at \(path)") }

    let langs = (args["langs"] ?? "en-US").split(separator: ",").map(String.init)

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = langs
    if #available(macOS 13.0, *) {
        request.automaticallyDetectsLanguage = true
    }

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    do {
        try handler.perform([request])
    } catch {
        fail("Text recognition failed: \(error.localizedDescription)")
    }

    let observations = (request.results ?? [])
        // Vision's boundingBox origin is bottom-left; sort top-to-bottom, then left-to-right.
        .sorted { a, b in
            let dy = b.boundingBox.maxY - a.boundingBox.maxY
            if abs(dy) > 0.02 { return dy < 0 }
            return a.boundingBox.minX < b.boundingBox.minX
        }

    var lines: [[String: Any]] = []
    for observation in observations {
        guard let candidate = observation.topCandidates(1).first else { continue }
        let box = observation.boundingBox
        lines.append([
            "text": candidate.string,
            "confidence": candidate.confidence,
            "box": [box.minX, 1 - box.maxY, box.width, box.height],
        ])
    }

    emit([
        "text": lines.compactMap { $0["text"] as? String }.joined(separator: "\n"),
        "lines": lines,
    ])
}

// MARK: - permissions

func permissions(args: Args) {
    switch args["request"] {
    case "screen":
        CGRequestScreenCaptureAccess()
    case "mic":
        let semaphore = DispatchSemaphore(value: 0)
        AVCaptureDevice.requestAccess(for: .audio) { _ in semaphore.signal() }
        _ = semaphore.wait(timeout: .now() + 120)
    default:
        break
    }
    emit([
        "screen": CGPreflightScreenCaptureAccess(),
        "mic": AVCaptureDevice.authorizationStatus(for: .audio) == .authorized,
    ])
}

// MARK: - main

@main
enum Helper {
    static func main() async {
        let args = Args(CommandLine.arguments)
        switch args.command {
        case "capture":
            if #available(macOS 14.0, *) {
                await capture(args: args)
            } else {
                fail("Teachya requires macOS 14 or newer")
            }
        case "ocr":
            ocr(args: args)
        case "permissions":
            permissions(args: args)
        default:
            fail("usage: teachya-helper <capture|ocr|permissions> [--key value]")
        }
    }
}
