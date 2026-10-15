//
//  CryptoEngine.swift
//  FileCrypto iOS (CryptoLab)
//
//  Tương thích 100% với FileCryptoQt (Desktop C++ / OpenSSL) & FileCrypto Web
//  Sử dụng Apple CryptoKit phần cứng và CommonCrypto
//

import Foundation
import CryptoKit
import CommonCrypto

public final class CryptoEngine {
    public static let shared = CryptoEngine()

    public enum Algorithm: UInt8, CaseIterable, Identifiable {
        case aes256Cbc = 1
        case aes256Gcm = 2
        case chaCha20Poly1305 = 3

        public var id: UInt8 { rawValue }

        public var name: String {
            switch self {
            case .aes256Cbc: return "AES-256-CBC + HMAC-SHA256"
            case .aes256Gcm: return "AES-256-GCM"
            case .chaCha20Poly1305: return "ChaCha20-Poly1305"
            }
        }

        public var shortDescription: String {
            switch self {
            case .aes256Cbc: return "Encrypt-then-MAC, 64-byte key"
            case .aes256Gcm: return "AEAD mặc định, tăng tốc phần cứng Apple"
            case .chaCha20Poly1305: return "AEAD chuẩn RFC 8439, tối ưu CPU ARM"
            }
        }
    }

    public struct FileInfo {
        public let version: Int
        public let magic: String
        public let algorithm: Algorithm
        public let originalName: String
        public let mimeType: String
        public let salt: Data
        public let iv: Data
        public let headerLength: Int
        public let authSize: Int
        public let payloadSize: Int
        public let authenticated: Bool
    }

    public struct DecryptResult {
        public let plaintext: Data
        public let originalName: String
        public let mimeType: String
        public let algorithm: Algorithm
        public let version: Int
    }

    public enum CryptoError: LocalizedError {
        case invalidMagic
        case unsupportedAlgorithm
        case corruptedHeader
        case missingData
        case authenticationFailed
        case decryptionFailed(String)
        case keyDerivationFailed

        public var errorDescription: String? {
            switch self {
            case .invalidMagic:
                return "Tệp không đúng định dạng FileCryptoQt (Magic Header phải là FCQ1 hoặc FCQ2)."
            case .unsupportedAlgorithm:
                return "Thuật toán mật mã trong tệp không được hỗ trợ."
            case .corruptedHeader:
                return "Cấu trúc Header của tệp FCQ bị lỗi hoặc bị cắt ngắn."
            case .missingData:
                return "Tệp mã hóa bị thiếu dữ liệu payload."
            case .authenticationFailed:
                return "Sai mật khẩu hoặc tệp đã bị thay đổi (Xác thực toàn vẹn AEAD/HMAC thất bại)."
            case .decryptionFailed(let msg):
                return "Giải mã thất bại: \(msg)"
            case .keyDerivationFailed:
                return "Không thể dẫn xuất khóa bảo mật (PBKDF2 thất bại)."
            }
        }
    }

    public static let iterations: UInt32 = 200_000
    public static let saltSize = 16
    public static let tagSize = 16
    public static let macSize = 32

    private init() {}

    // MARK: - Key Derivation
    public static func deriveKey(password: String, salt: Data, length: Int) throws -> Data {
        var derivedKey = Data(repeating: 0, count: length)
        let status = derivedKey.withUnsafeMutableBytes { derivedKeyBytes in
            salt.withUnsafeBytes { saltBytes in
                password.withCString { passBytes in
                    CCKeyDerivationPBKDF(
                        CCPBKDFAlgorithm(kCCPBKDF2),
                        passBytes,
                        password.utf8.count,
                        saltBytes.bindMemory(to: UInt8.self).baseAddress,
                        salt.count,
                        CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),
                        iterations,
                        derivedKeyBytes.bindMemory(to: UInt8.self).baseAddress,
                        length
                    )
                }
            }
        }
        guard status == kCCSuccess else {
            throw CryptoError.keyDerivationFailed
        }
        return derivedKey
    }

    // MARK: - Random Bytes (CSPRNG)
    public static func randomBytes(count: Int) -> Data {
        var bytes = Data(count: count)
        _ = bytes.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, count, $0.baseAddress!) }
        return bytes
    }

    // MARK: - Inspect FCQ Header
    public static func inspect(data: Data) throws -> FileInfo {
        guard data.count >= 37 else {
            throw CryptoError.corruptedHeader
        }
        guard let magic = String(data: data.prefix(4), encoding: .ascii) else {
            throw CryptoError.invalidMagic
        }

        if magic == "FCQ1" {
            guard let alg = Algorithm(rawValue: data[4]) else {
                throw CryptoError.unsupportedAlgorithm
            }
            let salt = data.subdata(in: 5..<21)
            let iv = data.subdata(in: 21..<37)
            let isAead = (alg != .aes256Cbc)
            let authSize = isAead ? tagSize : 0
            let payloadSize = max(0, data.count - 37 - authSize)

            return FileInfo(
                version: 1,
                magic: "FCQ1",
                algorithm: alg,
                originalName: "",
                mimeType: "application/octet-stream",
                salt: salt,
                iv: iv,
                headerLength: 37,
                authSize: authSize,
                payloadSize: payloadSize,
                authenticated: isAead
            )
        } else if magic == "FCQ2" {
            guard data.count >= 22 else { throw CryptoError.corruptedHeader }
            guard let alg = Algorithm(rawValue: data[4]) else {
                throw CryptoError.unsupportedAlgorithm
            }
            let salt = data.subdata(in: 5..<21)
            let ivLen = Int(data[21])
            guard ivLen >= 12, ivLen <= 16, data.count >= 22 + ivLen + 4 else {
                throw CryptoError.corruptedHeader
            }

            var pos = 22
            let iv = data.subdata(in: pos..<(pos + ivLen))
            pos += ivLen

            let nameLen = Int(UInt16(data[pos]) << 8 | UInt16(data[pos + 1]))
            pos += 2
            guard data.count >= pos + nameLen + 2 else { throw CryptoError.corruptedHeader }
            let originalName = String(data: data.subdata(in: pos..<(pos + nameLen)), encoding: .utf8) ?? ""
            pos += nameLen

            let mimeLen = Int(UInt16(data[pos]) << 8 | UInt16(data[pos + 1]))
            pos += 2
            guard data.count >= pos + mimeLen else { throw CryptoError.corruptedHeader }
            let mimeType = String(data: data.subdata(in: pos..<(pos + mimeLen)), encoding: .utf8) ?? ""
            pos += mimeLen

            let isAead = (alg == .aes256Gcm || alg == .chaCha20Poly1305)
            let authSize = isAead ? tagSize : macSize
            let headerLength = pos
            let payloadSize = max(0, data.count - headerLength - authSize)

            return FileInfo(
                version: 2,
                magic: "FCQ2",
                algorithm: alg,
                originalName: originalName,
                mimeType: mimeType.isEmpty ? "application/octet-stream" : mimeType,
                salt: salt,
                iv: iv,
                headerLength: headerLength,
                authSize: authSize,
                payloadSize: payloadSize,
                authenticated: true
            )
        } else {
            throw CryptoError.invalidMagic
        }
    }

    // MARK: - Encrypt
    public static func encrypt(data: Data, fileName: String, mimeType: String, password: String, algorithm: Algorithm, progress: ((Double, String) -> Void)? = nil) throws -> Data {
        let isAead = (algorithm == .aes256Gcm || algorithm == .chaCha20Poly1305)
        let salt = randomBytes(count: saltSize)
        let ivLen = isAead ? 12 : 16
        let iv = randomBytes(count: ivLen)

        progress?(0.15, "Dẫn xuất khóa PBKDF2 (200.000 vòng)...")
        let keyMaterial = try deriveKey(password: password, salt: salt, length: isAead ? 32 : 64)

        progress?(0.40, "Đóng gói metadata FCQ2...")
        let nameData = fileName.data(using: .utf8) ?? Data()
        let mimeData = mimeType.data(using: .utf8) ?? Data()

        // Construct FCQ2 Header
        var header = Data("FCQ2".utf8)
        header.append(algorithm.rawValue)
        header.append(salt)
        header.append(UInt8(ivLen))
        header.append(iv)

        var nameLenBE = UInt16(nameData.count).bigEndian
        withUnsafeBytes(of: &nameLenBE) { header.append(contentsOf: $0) }
        header.append(nameData)

        var mimeLenBE = UInt16(mimeData.count).bigEndian
        withUnsafeBytes(of: &mimeLenBE) { header.append(contentsOf: $0) }
        header.append(mimeData)

        var ciphertext: Data
        var tagOrMac: Data

        progress?(0.65, "Mã hóa dữ liệu với \(algorithm.name)...")

        switch algorithm {
        case .aes256Gcm:
            let key = SymmetricKey(data: keyMaterial)
            let nonce = try AES.GCM.Nonce(data: iv)
            let sealed = try AES.GCM.seal(data, using: key, nonce: nonce, authenticating: header)
            ciphertext = sealed.ciphertext
            tagOrMac = sealed.tag

        case .chaCha20Poly1305:
            let key = SymmetricKey(data: keyMaterial)
            let nonce = try ChaChaPoly.Nonce(data: iv)
            let sealed = try ChaChaPoly.seal(data, using: key, nonce: nonce, authenticating: header)
            ciphertext = sealed.ciphertext
            tagOrMac = sealed.tag

        case .aes256Cbc:
            let aesKey = keyMaterial.subdata(in: 0..<32)
            let hmacKey = keyMaterial.subdata(in: 32..<64)

            // AES-256-CBC with PKCS#7
            var buffer = Data(count: data.count + kCCBlockSizeAES128)
            var numBytesEncrypted: size_t = 0
            let status = buffer.withUnsafeMutableBytes { bufBytes in
                data.withUnsafeBytes { inBytes in
                    iv.withUnsafeBytes { ivBytes in
                        aesKey.withUnsafeBytes { keyBytes in
                            CCCrypt(
                                CCOperation(kCCEncrypt),
                                CCAlgorithm(kCCAlgorithmAES),
                                CCOptions(kCCOptionPKCS7Padding),
                                keyBytes.baseAddress, kCCKeySizeAES256,
                                ivBytes.baseAddress,
                                inBytes.baseAddress, data.count,
                                bufBytes.baseAddress, bufBytes.count,
                                &numBytesEncrypted
                            )
                        }
                    }
                }
            }
            guard status == kCCSuccess else {
                throw CryptoError.decryptionFailed("Mã hóa AES-CBC lỗi (Status \(status))")
            }
            buffer.count = numBytesEncrypted
            ciphertext = buffer

            // HMAC-SHA256 over (header + ciphertext)
            var macInput = header
            macInput.append(ciphertext)
            let mac = HMAC<SHA256>.authenticationCode(for: macInput, using: SymmetricKey(data: hmacKey))
            tagOrMac = Data(mac)
        }

        progress?(0.90, "Hoàn tất đóng gói...")
        var result = header
        result.append(ciphertext)
        result.append(tagOrMac)

        progress?(1.0, "Mã hóa thành công!")
        return result
    }

    // MARK: - Decrypt
    public static func decrypt(data: Data, password: String, progress: ((Double, String) -> Void)? = nil) throws -> DecryptResult {
        progress?(0.10, "Phân tích cấu trúc header FCQ...")
        let info = try inspect(data: data)

        let header = data.subdata(in: 0..<info.headerLength)
        let payloadEnd = data.count - info.authSize
        guard payloadEnd >= info.headerLength else {
            throw CryptoError.missingData
        }

        let ciphertext = data.subdata(in: info.headerLength..<payloadEnd)
        let tagOrMac = info.authSize > 0 ? data.subdata(in: payloadEnd..<data.count) : Data()

        progress?(0.30, "Dẫn xuất khóa PBKDF2 (200.000 vòng)...")
        let keyLen = (info.version == 2 && info.algorithm == .aes256Cbc) ? 64 : 32
        let keyMaterial = try deriveKey(password: password, salt: info.salt, length: keyLen)

        progress?(0.60, "Giải mã và xác thực toàn vẹn (\(info.algorithm.name))...")

        var plaintext: Data

        switch info.algorithm {
        case .aes256Gcm:
            let iv = (info.version == 1) ? info.iv.prefix(12) : info.iv
            let key = SymmetricKey(data: keyMaterial)
            do {
                let nonce = try AES.GCM.Nonce(data: iv)
                let sealed = try AES.GCM.SealedBox(nonce: nonce, ciphertext: ciphertext, tag: tagOrMac)
                plaintext = try AES.GCM.open(sealed, using: key, authenticating: (info.version == 2 ? header : Data()))
            } catch {
                throw CryptoError.authenticationFailed
            }

        case .chaCha20Poly1305:
            let iv = (info.version == 1) ? info.iv.prefix(12) : info.iv
            let key = SymmetricKey(data: keyMaterial)
            do {
                let nonce = try ChaChaPoly.Nonce(data: iv)
                let sealed = try ChaChaPoly.SealedBox(nonce: nonce, ciphertext: ciphertext, tag: tagOrMac)
                plaintext = try ChaChaPoly.open(sealed, using: key, authenticating: (info.version == 2 ? header : Data()))
            } catch {
                throw CryptoError.authenticationFailed
            }

        case .aes256Cbc:
            let aesKey = keyMaterial.subdata(in: 0..<32)

            if info.version == 2 {
                let hmacKey = keyMaterial.subdata(in: 32..<64)
                var macInput = header
                macInput.append(ciphertext)
                let expectedMac = HMAC<SHA256>.authenticationCode(for: macInput, using: SymmetricKey(data: hmacKey))
                guard Data(expectedMac) == tagOrMac else {
                    throw CryptoError.authenticationFailed
                }
            }

            var buffer = Data(count: ciphertext.count + kCCBlockSizeAES128)
            var numBytesDecrypted: size_t = 0
            let status = buffer.withUnsafeMutableBytes { bufBytes in
                ciphertext.withUnsafeBytes { cipherBytes in
                    info.iv.withUnsafeBytes { ivBytes in
                        aesKey.withUnsafeBytes { keyBytes in
                            CCCrypt(
                                CCOperation(kCCDecrypt),
                                CCAlgorithm(kCCAlgorithmAES),
                                CCOptions(kCCOptionPKCS7Padding),
                                keyBytes.baseAddress, kCCKeySizeAES256,
                                ivBytes.baseAddress,
                                cipherBytes.baseAddress, ciphertext.count,
                                bufBytes.baseAddress, bufBytes.count,
                                &numBytesDecrypted
                            )
                        }
                    }
                }
            }
            guard status == kCCSuccess else {
                throw CryptoError.authenticationFailed
            }
            buffer.count = numBytesDecrypted
            plaintext = buffer
        }

        progress?(1.0, "Giải mã hoàn tất!")

        return DecryptResult(
            plaintext: plaintext,
            originalName: info.originalName,
            mimeType: info.mimeType,
            algorithm: info.algorithm,
            version: info.version
        )
    }

    public static func suggestedEncryptedPath(for filename: String) -> String {
        return filename + ".fcq"
    }

    public static func suggestedDecryptedPath(currentFilename: String, originalName: String?) -> String {
        if let orig = originalName, !orig.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return "restored_" + orig
        }
        var base = currentFilename
        if base.lowercased().hasSuffix(".fcq") {
            base = String(base.dropLast(4))
        }
        return base + ".decrypted"
    }
}
