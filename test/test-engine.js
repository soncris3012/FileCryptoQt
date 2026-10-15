/**
 * Unit Test Suite for CryptoEngine Web
 * Kiểm tra mã hóa / giải mã roundtrip và bảo mật tính toàn vẹn
 */

const assert = require('assert');
const CryptoEngine = require('../js/crypto-engine.js');

async function runTests() {
    console.log("=== BẮT ĐẦU KIỂM THỬ CRYPTOENGINE WEB ===");

    const sampleText = "Xin chào! Đây là dữ liệu kiểm thử FileCryptoQt Web 2026. Tương thích C++ OpenSSL và Apple Swift CryptoKit.";
    const sampleData = new TextEncoder().encode(sampleText);
    const password = "SuperSecretPassword#2026";
    const fileName = "test_document.txt";
    const mimeType = "text/plain";

    for (const [algKey, algVal] of Object.entries(CryptoEngine.Algorithm)) {
        const algName = CryptoEngine.AlgorithmNames[algVal];
        console.log(`\n--- Kiểm tra thuật toán ${algVal}: ${algName} ---`);

        // 1. Mã hóa
        let encProgressCount = 0;
        const encrypted = await CryptoEngine.encryptFile(
            sampleData,
            fileName,
            mimeType,
            password,
            algVal,
            (p, msg) => { encProgressCount++; }
        );
        assert(encrypted instanceof Uint8Array, "Kết quả mã hóa phải là Uint8Array");
        assert(encrypted.length > sampleData.length, "Dữ liệu mã hóa phải lớn hơn dữ liệu gốc");
        console.log(`✓ Mã hóa thành công: ${encrypted.length} bytes (gốc ${sampleData.length} bytes)`);

        // 2. Kiểm tra Header
        const info = CryptoEngine.inspectFile(encrypted);
        assert.strictEqual(info.version, 2, "Phiên bản phải là 2 (FCQ2)");
        assert.strictEqual(info.algorithm, algVal, "Mã thuật toán phải khớp");
        assert.strictEqual(info.originalName, fileName, "Tên tệp gốc phải khớp");
        assert.strictEqual(info.mimeType, mimeType, "MIME type phải khớp");
        assert.strictEqual(info.authenticated, true, "Phải có xác thực toàn vẹn");
        console.log(`✓ Inspect header chính xác: ${info.originalName} (${info.mimeType}), Payload: ${info.payloadSize}B, Auth: ${info.authSize}B`);

        // 3. Giải mã đúng mật khẩu
        let decProgressCount = 0;
        const decResult = await CryptoEngine.decryptFile(
            encrypted,
            password,
            (p, msg) => { decProgressCount++; }
        );
        const restoredText = new TextDecoder('utf8').decode(decResult.plaintext);
        assert.strictEqual(restoredText, sampleText, "Nội dung giải mã phải trùng khớp 100%");
        assert.strictEqual(decResult.originalName, fileName, "Tên tệp khôi phục phải đúng");
        console.log(`✓ Giải mã thành công: "${restoredText.substring(0, 45)}..."`);

        // 4. Kiểm tra sai mật khẩu
        let failedWrongPass = false;
        try {
            await CryptoEngine.decryptFile(encrypted, "WrongPassword@123");
        } catch (e) {
            failedWrongPass = true;
            console.log(`✓ Từ chối sai mật khẩu thành công: ${e.message}`);
        }
        assert(failedWrongPass, "Phải ném lỗi khi giải mã bằng sai mật khẩu");

        // 5. Kiểm tra sửa đổi dữ liệu (Tampering detection)
        const tampered = new Uint8Array(encrypted);
        // Tamper one byte in the ciphertext
        const tamperIndex = info.headerLength + Math.floor(info.payloadSize / 2);
        tampered[tamperIndex] ^= 0x55;

        let failedTamper = false;
        try {
            await CryptoEngine.decryptFile(tampered, password);
        } catch (e) {
            failedTamper = true;
            console.log(`✓ Phát hiện dữ liệu bị sửa đổi thành công: ${e.message}`);
        }
        assert(failedTamper, "Phải ném lỗi khi dữ liệu bản mã bị can thiệp");
    }

    console.log("\n=========================================");
    console.log(" TẤT CẢ 3 THUẬT TOÁN ĐÃ ĐẠT 100% TEST! ");
    console.log("=========================================\n");
}

runTests().catch(err => {
    console.error("LỖI TEST:", err);
    process.exit(1);
});
