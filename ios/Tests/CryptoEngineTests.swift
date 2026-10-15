//
//  CryptoEngineTests.swift
//  FileCrypto iOS Tests
//

import Foundation
#if canImport(XCTest)
import XCTest
#endif

public final class CryptoEngineTests {
    public static func runAllTests() throws {
        print("=== BẮT ĐẦU KIỂM THỬ CRYPTOENGINE IOS (SWIFT 6) ===")

        let sampleText = "Xin chào từ Apple iOS Swift! Kiểm thử tính tương thích FCQ2 với Qt OpenSSL và Web."
        let sampleData = sampleText.data(using: .utf8)!
        let password = "AppleSecurePassword#2026"
        let filename = "apple_document.txt"
        let mimeType = "text/plain"

        for alg in CryptoEngine.Algorithm.allCases {
            print("\n--- Kiểm thử thuật toán \(alg.rawValue): \(alg.name) ---")

            // 1. Mã hóa
            var encProgressUpdates = 0
            let encrypted = try CryptoEngine.encrypt(
                data: sampleData,
                fileName: filename,
                mimeType: mimeType,
                password: password,
                algorithm: alg
            ) { p, msg in
                encProgressUpdates += 1
            }

            assert(encrypted.count > sampleData.count, "Dữ liệu mã hóa phải lớn hơn dữ liệu gốc")
            print("✓ Mã hóa thành công: \(encrypted.count) bytes (gốc \(sampleData.count) bytes)")

            // 2. Soi Header
            let info = try CryptoEngine.inspect(data: encrypted)
            assert(info.version == 2, "Phiên bản phải là 2 (FCQ2)")
            assert(info.algorithm == alg, "Mã thuật toán phải khớp")
            assert(info.originalName == filename, "Tên gốc phải khớp")
            assert(info.mimeType == mimeType, "MIME type phải khớp")
            assert(info.authenticated == true, "Phải có xác thực toàn vẹn")
            print("✓ Header FCQ2 chính xác: \(info.originalName) (\(info.mimeType)), Payload: \(info.payloadSize)B, Auth: \(info.authSize)B")

            // 3. Giải mã đúng mật khẩu
            var decProgressUpdates = 0
            let decrypted = try CryptoEngine.decrypt(
                data: encrypted,
                password: password
            ) { p, msg in
                decProgressUpdates += 1
            }

            let restoredString = String(data: decrypted.plaintext, encoding: .utf8) ?? ""
            assert(restoredString == sampleText, "Nội dung giải mã phải khớp 100%")
            assert(decrypted.originalName == filename, "Tên file khôi phục phải khớp")
            assert(decrypted.algorithm == alg, "Thuật toán trả về phải khớp")
            print("✓ Giải mã thành công: \"\(String(restoredString.prefix(45)))...\"")

            // 4. Kiểm tra sai mật khẩu
            var failedWrongPass = false
            do {
                _ = try CryptoEngine.decrypt(data: encrypted, password: "IncorrectPassword123!")
            } catch {
                failedWrongPass = true
                print("✓ Từ chối sai mật khẩu thành công: \(error.localizedDescription)")
            }
            assert(failedWrongPass, "Phải ném lỗi khi giải mã bằng sai mật khẩu")

            // 5. Kiểm tra bẫy can thiệp dữ liệu (Tamper Detection)
            var tampered = encrypted
            let tamperIndex = info.headerLength + (info.payloadSize / 2)
            tampered[tamperIndex] ^= 0x5A

            var failedTamper = false
            do {
                _ = try CryptoEngine.decrypt(data: tampered, password: password)
            } catch {
                failedTamper = true
                print("✓ Phát hiện can thiệp dữ liệu thành công: \(error.localizedDescription)")
            }
            assert(failedTamper, "Phải ném lỗi khi dữ liệu bị sửa đổi")
        }

        print("\n=========================================")
        print(" TẤT CẢ TEST TRÊN IOS ĐÃ ĐẠT 100%! ")
        print("=========================================\n")
    }
}

@main
struct TestRunner {
    static func main() {
        do {
            try CryptoEngineTests.runAllTests()
        } catch {
            print("LỖI TEST:", error)
            exit(1)
        }
    }
}
