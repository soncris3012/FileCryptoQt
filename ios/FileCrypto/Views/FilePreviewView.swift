//
//  FilePreviewView.swift
//  FileCrypto iOS
//

import SwiftUI
import AVKit

public struct FilePreviewView: View {
    public let data: Data?
    public let filename: String
    public let mimeType: String

    @State private var previewMode: PreviewMode = .auto

    public enum PreviewMode: String, CaseIterable, Identifiable {
        case auto = "Tự động"
        case text = "Văn bản"
        case hex = "Bảng HEX"

        public var id: String { rawValue }
    }

    public init(data: Data?, filename: String, mimeType: String) {
        self.data = data
        self.filename = filename
        self.mimeType = mimeType
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Xem trước tệp", systemImage: "eye.fill")
                    .font(.headline)
                    .foregroundColor(.primary)

                Spacer()

                if data != nil {
                    Picker("Chế độ xem", selection: $previewMode) {
                        ForEach(PreviewMode.allCases) { mode in
                            Text(mode.rawValue).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)
                    .frame(maxWidth: 220)
                }
            }

            if let data = data, !data.isEmpty {
                Group {
                    switch previewMode {
                    case .auto:
                        autoPreview(data: data)
                    case .text:
                        textView(data: data)
                    case .hex:
                        hexView(data: data)
                    }
                }
                .frame(minHeight: 220, maxHeight: 340)
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
            } else {
                VStack(spacing: 8) {
                    Image(systemName: "doc.viewfinder")
                        .font(.system(size: 36))
                        .foregroundColor(.secondary)
                    Text("Chưa có tệp nào được chọn để xem trước")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, minHeight: 180)
                .background(Color(UIColor.secondarySystemBackground).opacity(0.5))
                .cornerRadius(12)
            }
        }
    }

    @ViewBuilder
    private func autoPreview(data: Data) -> some View {
        let ext = (filename as NSString).pathExtension.lowercased()

        // 1. Image
        if mimeType.starts(with: "image/") || ["png", "jpg", "jpeg", "gif", "webp", "heic"].contains(ext) {
            if let uiImage = UIImage(data: data) {
                ScrollView([.horizontal, .vertical]) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: .infinity, maxHeight: 300)
                        .padding()
                }
            } else {
                hexView(data: data)
            }
        }
        // 2. Video or Audio
        else if mimeType.starts(with: "video/") || mimeType.starts(with: "audio/") || ["mp4", "mov", "mp3", "wav", "m4a"].contains(ext) {
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
            let _ = try? data.write(to: tempURL)
            VideoPlayer(player: AVPlayer(url: tempURL))
                .frame(maxHeight: 300)
        }
        // 3. Text
        else if isTextCandidate(ext: ext) || isUtf8Printable(data: data) {
            textView(data: data)
        }
        // 4. Default: Hex Dump
        else {
            hexView(data: data)
        }
    }

    private func isTextCandidate(ext: String) -> Bool {
        ["txt", "json", "xml", "html", "css", "js", "ts", "swift", "md", "py", "c", "cpp", "h", "log", "yaml", "yml"].contains(ext)
    }

    private func isUtf8Printable(data: Data) -> Bool {
        guard data.count > 0 else { return false }
        let checkLen = min(data.count, 512)
        var printable = 0
        for i in 0..<checkLen {
            let b = data[i]
            if (b >= 32 && b <= 126) || b == 9 || b == 10 || b == 13 {
                printable += 1
            }
        }
        return Double(printable) / Double(checkLen) > 0.85
    }

    @ViewBuilder
    private func textView(data: Data) -> some View {
        if let string = String(data: data.prefix(100_000), encoding: .utf8) {
            let lines = string.components(separatedBy: "\n")
            ScrollView {
                HStack(alignment: .top, spacing: 10) {
                    VStack(alignment: .trailing, spacing: 2) {
                        ForEach(0..<min(lines.count, 500), id: \.self) { idx in
                            Text("\(idx + 1)")
                                .font(.system(size: 11, weight: .regular, design: .monospaced))
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.leading, 8)

                    VStack(alignment: .leading, spacing: 2) {
                        ForEach(0..<min(lines.count, 500), id: \.self) { idx in
                            Text(lines[idx])
                                .font(.system(size: 11, weight: .regular, design: .monospaced))
                                .foregroundColor(.primary)
                                .textSelection(.enabled)
                        }
                    }
                    Spacer()
                }
                .padding(.vertical, 8)
            }
        } else {
            VStack {
                Text("Không thể hiển thị dưới dạng văn bản UTF-8.")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Button("Xem dạng HEX") {
                    previewMode = .hex
                }
                .buttonStyle(.borderedProminent)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    @ViewBuilder
    private func hexView(data: Data) -> some View {
        let dump = formatHexDump(data: data)
        ScrollView([.horizontal, .vertical]) {
            Text(dump)
                .font(.system(size: 10.5, weight: .medium, design: .monospaced))
                .foregroundColor(.cyan)
                .padding(8)
                .textSelection(.enabled)
        }
    }

    private func formatHexDump(data: Data, maxBytes: Int = 4096) -> String {
        let count = min(data.count, maxBytes)
        var result = ""
        for i in stride(from: 0, to: count, by: 16) {
            let offset = String(format: "%08X", i)
            var hexString = ""
            var asciiString = ""

            for j in 0..<16 {
                if i + j < count {
                    let byte = data[i + j]
                    hexString += String(format: "%02X ", byte)
                    if j == 7 { hexString += " " }
                    if byte >= 32 && byte <= 126 {
                        asciiString += String(UnicodeScalar(byte))
                    } else {
                        asciiString += "."
                    }
                } else {
                    hexString += "   "
                    if j == 7 { hexString += " " }
                }
            }
            result += "\(offset)  \(hexString) |\(asciiString)|\n"
        }
        if data.count > maxBytes {
            result += "\n... [Đã cắt ngắn \(maxBytes) / \(data.count) bytes để tối ưu giao diện] ..."
        }
        return result
    }
}
