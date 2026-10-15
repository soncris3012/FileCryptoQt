//
//  CryptoViewModel.swift
//  FileCrypto iOS
//

import Foundation
import SwiftUI
import Combine

@MainActor
public final class CryptoViewModel: ObservableObject {
    // Mode
    public enum TabMode {
        case encrypt, decrypt, inspect, settings
    }

    @Published public var currentTab: TabMode = .encrypt

    // Selected File
    @Published public var selectedFileURL: URL?
    @Published public var selectedFileData: Data?
    @Published public var selectedFileName: String = ""
    @Published public var selectedFileSize: Int = 0
    @Published public var selectedFileMime: String = "application/octet-stream"

    // Configuration
    @Published public var selectedAlgorithm: CryptoEngine.Algorithm = .aes256Gcm
    @Published public var password: String = ""
    @Published public var isPasswordVisible: Bool = false

    // Progress & Status
    @Published public var isProcessing: Bool = false
    @Published public var progressValue: Double = 0.0
    @Published public var progressMessage: String = ""
    @Published public var errorMessage: String?
    @Published public var showErrorAlert: Bool = false

    // Results
    @Published public var outputData: Data?
    @Published public var outputURL: URL?
    @Published public var outputFileName: String = ""
    @Published public var isCompleted: Bool = false
    @Published public var completionMessage: String = ""

    // Header Inspection Info
    @Published public var inspectedInfo: CryptoEngine.FileInfo?

    public init() {}

    // MARK: - File Selection
    public func selectFile(url: URL) {
        guard url.startAccessingSecurityScopedResource() else {
            // If direct access works without security scope
            loadFile(url: url)
            return
        }
        defer { url.stopAccessingSecurityScopedResource() }
        loadFile(url: url)
    }

    private func loadFile(url: URL) {
        do {
            let data = try Data(contentsOf: url)
            self.selectedFileURL = url
            self.selectedFileData = data
            self.selectedFileName = url.lastPathComponent
            self.selectedFileSize = data.count
            self.selectedFileMime = mimeType(for: url.pathExtension)
            self.resetResults()

            // If user opens a .fcq file while in encrypt tab, switch to decrypt
            if url.pathExtension.lowercased() == "fcq" && currentTab == .encrypt {
                currentTab = .decrypt
            }

            // If in inspect tab, auto-inspect
            if currentTab == .inspect {
                inspectCurrentFile()
            }
        } catch {
            showError("Không thể đọc tệp: \(error.localizedDescription)")
        }
    }

    public func clearFile() {
        self.selectedFileURL = nil
        self.selectedFileData = nil
        self.selectedFileName = ""
        self.selectedFileSize = 0
        self.inspectedInfo = nil
        resetResults()
    }

    public func resetResults() {
        self.outputData = nil
        self.outputURL = nil
        self.outputFileName = ""
        self.isCompleted = false
        self.completionMessage = ""
        self.progressValue = 0.0
        self.progressMessage = ""
    }

    // MARK: - Password Helpers
    public func generateRandomPassword() {
        let chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+{}[]"
        let randomBytes = CryptoEngine.randomBytes(count: 16)
        var pass = ""
        for b in randomBytes {
            let idx = Int(b) % chars.count
            let char = chars[chars.index(chars.startIndex, offsetBy: idx)]
            pass.append(char)
        }
        self.password = pass
        self.isPasswordVisible = true
    }

    public var passwordStrength: (score: Int, label: String, color: Color) {
        if password.isEmpty { return (0, "Chưa nhập", .gray) }
        var score = 0
        if password.count >= 8 { score += 25 }
        if password.count >= 12 { score += 15 }
        if password.rangeOfCharacter(from: .uppercaseLetters) != nil { score += 20 }
        if password.rangeOfCharacter(from: .decimalDigits) != nil { score += 20 }
        if password.rangeOfCharacter(from: .punctuationCharacters) != nil || password.rangeOfCharacter(from: .symbols) != nil { score += 20 }

        if score < 40 {
            return (score, "Yếu", .red)
        } else if score < 75 {
            return (score, "Trung bình", .orange)
        } else {
            return (min(100, score), "Rất mạnh (PBKDF2 200.000 vòng)", .green)
        }
    }

    // MARK: - Execute Encrypt
    public func runEncrypt() {
        guard let data = selectedFileData else {
            showError("Vui lòng chọn tệp để mã hóa.")
            return
        }
        guard !password.isEmpty else {
            showError("Vui lòng nhập mật khẩu bảo vệ.")
            return
        }

        isProcessing = true
        resetResults()

        Task.detached(priority: .userInitiated) { [weak self, data, selectedFileName = self.selectedFileName, mime = self.selectedFileMime, pass = self.password, alg = self.selectedAlgorithm] in
            do {
                let encrypted = try CryptoEngine.encrypt(
                    data: data,
                    fileName: selectedFileName,
                    mimeType: mime,
                    password: pass,
                    algorithm: alg
                ) { progress, msg in
                    Task { @MainActor [weak self] in
                        self?.progressValue = progress
                        self?.progressMessage = msg
                    }
                }

                let outName = CryptoEngine.suggestedEncryptedPath(for: selectedFileName)
                let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(outName)
                try encrypted.write(to: tempURL)

                await MainActor.run { [weak self] in
                    self?.outputData = encrypted
                    self?.outputURL = tempURL
                    self?.outputFileName = outName
                    self?.isCompleted = true
                    self?.completionMessage = "Đã mã hóa thành công với \(alg.name)!"
                    self?.isProcessing = false
                }
            } catch {
                await MainActor.run { [weak self] in
                    self?.isProcessing = false
                    self?.showError("Lỗi mã hóa: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Execute Decrypt
    public func runDecrypt() {
        guard let data = selectedFileData else {
            showError("Vui lòng chọn tệp .fcq để giải mã.")
            return
        }
        guard !password.isEmpty else {
            showError("Vui lòng nhập mật khẩu giải mã.")
            return
        }

        isProcessing = true
        resetResults()

        Task.detached(priority: .userInitiated) { [weak self, data, selectedFileName = self.selectedFileName, pass = self.password] in
            do {
                let result = try CryptoEngine.decrypt(
                    data: data,
                    password: pass
                ) { progress, msg in
                    Task { @MainActor [weak self] in
                        self?.progressValue = progress
                        self?.progressMessage = msg
                    }
                }

                let outName = CryptoEngine.suggestedDecryptedPath(currentFilename: selectedFileName, originalName: result.originalName)
                let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(outName)
                try result.plaintext.write(to: tempURL)

                await MainActor.run { [weak self] in
                    self?.outputData = result.plaintext
                    self?.outputURL = tempURL
                    self?.outputFileName = outName
                    self?.isCompleted = true
                    self?.completionMessage = "Giải mã và xác thực toàn vẹn thành công!\nTên gốc: \(result.originalName) (\(result.mimeType))"
                    self?.isProcessing = false
                }
            } catch {
                await MainActor.run { [weak self] in
                    self?.isProcessing = false
                    self?.showError("Lỗi giải mã: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Inspect
    public func inspectCurrentFile() {
        guard let data = selectedFileData else { return }
        do {
            let info = try CryptoEngine.inspect(data: data)
            self.inspectedInfo = info
        } catch {
            showError("Không thể phân tích header: \(error.localizedDescription)")
        }
    }

    private func showError(_ msg: String) {
        self.errorMessage = msg
        self.showErrorAlert = true
    }

    private func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "txt", "log", "md": return "text/plain"
        case "html", "htm": return "text/html"
        case "json": return "application/json"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "gif": return "image/gif"
        case "mp4": return "video/mp4"
        case "mp3": return "audio/mp3"
        case "pdf": return "application/pdf"
        case "zip": return "application/zip"
        default: return "application/octet-stream"
        }
    }
}
