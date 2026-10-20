/**
 * FileCrypto Web — CryptoLab Core Engine
 * Tương thích 100% với FileCryptoQt (Desktop C++ / OpenSSL) & FileCrypto iOS (Swift / CryptoKit)
 * Hỗ trợ FCQ2 và FCQ1
 * Thuật toán: AES-256-GCM, ChaCha20-Poly1305 (RFC 8439), AES-256-CBC + HMAC-SHA256
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CryptoEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    const ITERATIONS = 200000;
    const SALT_SIZE = 16;
    const TAG_SIZE = 16;
    const MAC_SIZE = 32;

    const Algorithm = {
        Aes256Cbc: 1,
        Aes256Gcm: 2,
        ChaCha20Poly1305: 3
    };

    const AlgorithmNames = {
        1: "AES-256-CBC + HMAC-SHA256",
        2: "AES-256-GCM",
        3: "ChaCha20-Poly1305"
    };

    // Environment check
    const isBrowser = typeof window !== 'undefined' && typeof window.crypto !== 'undefined' && typeof window.crypto.subtle !== 'undefined';
    let nodeCrypto = null;
    if (!isBrowser) {
        try {
            nodeCrypto = require('crypto');
        } catch (e) { }
    }

    // Helper: secure random bytes
    function getRandomBytes(n) {
        const b = new Uint8Array(n);
        if (isBrowser) {
            window.crypto.getRandomValues(b);
        } else if (nodeCrypto) {
            const buf = nodeCrypto.randomBytes(n);
            b.set(buf);
        } else {
            throw new Error("Không có nguồn dữ liệu ngẫu nhiên bảo mật (CSPRNG).");
        }
        return b;
    }

    // Helper: PBKDF2-HMAC-SHA256
    async function deriveKeyBytes(password, salt, length) {
        const passBytes = new TextEncoder().encode(password);
        if (isBrowser) {
            const baseKey = await window.crypto.subtle.importKey(
                "raw",
                passBytes,
                { name: "PBKDF2" },
                false,
                ["deriveBits"]
            );
            const bits = await window.crypto.subtle.deriveBits(
                {
                    name: "PBKDF2",
                    salt: salt,
                    iterations: ITERATIONS,
                    hash: "SHA-256"
                },
                baseKey,
                length * 8
            );
            return new Uint8Array(bits);
        } else if (nodeCrypto) {
            return new Promise((resolve, reject) => {
                nodeCrypto.pbkdf2(
                    Buffer.from(passBytes),
                    Buffer.from(salt),
                    ITERATIONS,
                    length,
                    'sha256',
                    (err, key) => {
                        if (err) reject(err);
                        else resolve(new Uint8Array(key));
                    }
                );
            });
        }
        throw new Error("Môi trường không hỗ trợ Web Crypto hoặc Node Crypto.");
    }

    // Constant-time comparison
    function constantTimeCompare(a, b) {
        if (a.length !== b.length) return false;
        let c = 0;
        for (let i = 0; i < a.length; i++) {
            c |= (a[i] ^ b[i]);
        }
        return c === 0;
    }

    // RFC 8439 / RFC 7539 ChaCha20-Poly1305 pure JavaScript
    const ChaCha20Poly1305 = {
        rotl(v, n) { return ((v << n) | (v >>> (32 - n))) >>> 0; },
        quarterRound(x, a, b, c, d) {
            x[a] = (x[a] + x[b]) >>> 0; x[d] = this.rotl(x[d] ^ x[a], 16);
            x[c] = (x[c] + x[d]) >>> 0; x[b] = this.rotl(x[b] ^ x[c], 12);
            x[a] = (x[a] + x[b]) >>> 0; x[d] = this.rotl(x[d] ^ x[a], 8);
            x[c] = (x[c] + x[d]) >>> 0; x[b] = this.rotl(x[b] ^ x[c], 7);
        },
        block(key, counter, nonce) {
            const state = new Uint32Array(16);
            state[0] = 0x61707865; state[1] = 0x3320646e; state[2] = 0x79622d32; state[3] = 0x6b206574;
            const kv = new DataView(key.buffer, key.byteOffset, key.byteLength);
            for (let i = 0; i < 8; i++) state[4 + i] = kv.getUint32(i * 4, true);
            state[12] = counter;
            const nv = new DataView(nonce.buffer, nonce.byteOffset, nonce.byteLength);
            state[13] = nv.getUint32(0, true);
            state[14] = nv.getUint32(4, true);
            state[15] = nv.getUint32(8, true);

            const w = new Uint32Array(state);
            for (let i = 0; i < 10; i++) {
                this.quarterRound(w, 0, 4, 8, 12);
                this.quarterRound(w, 1, 5, 9, 13);
                this.quarterRound(w, 2, 6, 10, 14);
                this.quarterRound(w, 3, 7, 11, 15);
                this.quarterRound(w, 0, 5, 10, 15);
                this.quarterRound(w, 1, 6, 11, 12);
                this.quarterRound(w, 2, 7, 8, 13);
                this.quarterRound(w, 3, 4, 9, 14);
            }
            const out = new Uint8Array(64);
            const ov = new DataView(out.buffer);
            for (let i = 0; i < 16; i++) {
                ov.setUint32(i * 4, (w[i] + state[i]) >>> 0, true);
            }
            return out;
        },
        process(key, counter, nonce, input) {
            const out = new Uint8Array(input.length);
            let c = counter;
            let pos = 0;
            while (pos < input.length) {
                const blk = this.block(key, c, nonce);
                c = (c + 1) >>> 0;
                const take = Math.min(64, input.length - pos);
                for (let i = 0; i < take; i++) out[pos + i] = input[pos + i] ^ blk[i];
                pos += take;
            }
            return out;
        },
        poly1305(key, message) {
            const r0 = (key[0] | (key[1] << 8) | (key[2] << 16) | (key[3] << 24)) & 0x0fffffff;
            const r1 = (key[4] | (key[5] << 8) | (key[6] << 16) | (key[7] << 24)) & 0x0ffffffc;
            const r2 = (key[8] | (key[9] << 8) | (key[10] << 16) | (key[11] << 24)) & 0x0ffffffc;
            const r3 = (key[12] | (key[13] << 8) | (key[14] << 16) | (key[15] << 24)) & 0x0ffffffc;

            const R = BigInt(r0 >>> 0) | (BigInt(r1 >>> 0) << 32n) | (BigInt(r2 >>> 0) << 64n) | (BigInt(r3 >>> 0) << 96n);
            let S = 0n;
            for (let i = 0; i < 16; i++) S |= BigInt(key[16 + i]) << BigInt(i * 8);

            const P = (1n << 130n) - 5n;
            let acc = 0n;
            let pos = 0;
            while (pos < message.length) {
                const take = Math.min(16, message.length - pos);
                let n = 0n;
                for (let i = 0; i < take; i++) n |= BigInt(message[pos + i]) << BigInt(i * 8);
                n |= 1n << BigInt(take * 8);
                acc = ((acc + n) * R) % P;
                pos += take;
            }
            acc = (acc + S) % (1n << 128n);
            const tag = new Uint8Array(16);
            for (let i = 0; i < 16; i++) tag[i] = Number((acc >> BigInt(i * 8)) & 0xffn);
            return tag;
        },
        encrypt(key, nonce, plaintext, aad) {
            aad = aad || new Uint8Array(0);
            const polyKeyBlock = this.block(key, 0, nonce);
            const polyKey = polyKeyBlock.subarray(0, 32);
            const ciphertext = this.process(key, 1, nonce, plaintext);

            const padLen = len => (len % 16 === 0 ? 0 : 16 - (len % 16));
            const aadPad = padLen(aad.length);
            const ctPad = padLen(ciphertext.length);
            const macData = new Uint8Array(aad.length + aadPad + ciphertext.length + ctPad + 16);
            let offset = 0;
            macData.set(aad, offset); offset += aad.length;
            offset += aadPad;
            macData.set(ciphertext, offset); offset += ciphertext.length;
            offset += ctPad;

            const dv = new DataView(macData.buffer, macData.byteOffset, macData.byteLength);
            dv.setBigUint64(offset, BigInt(aad.length), true);
            dv.setBigUint64(offset + 8, BigInt(ciphertext.length), true);

            const tag = this.poly1305(polyKey, macData);
            return { ciphertext, tag };
        },
        decrypt(key, nonce, ciphertext, tag, aad) {
            aad = aad || new Uint8Array(0);
            const polyKeyBlock = this.block(key, 0, nonce);
            const polyKey = polyKeyBlock.subarray(0, 32);

            const padLen = len => (len % 16 === 0 ? 0 : 16 - (len % 16));
            const aadPad = padLen(aad.length);
            const ctPad = padLen(ciphertext.length);
            const macData = new Uint8Array(aad.length + aadPad + ciphertext.length + ctPad + 16);
            let offset = 0;
            macData.set(aad, offset); offset += aad.length;
            offset += aadPad;
            macData.set(ciphertext, offset); offset += ciphertext.length;
            offset += ctPad;

            const dv = new DataView(macData.buffer, macData.byteOffset, macData.byteLength);
            dv.setBigUint64(offset, BigInt(aad.length), true);
            dv.setBigUint64(offset + 8, BigInt(ciphertext.length), true);

            const expectedTag = this.poly1305(polyKey, macData);
            if (!constantTimeCompare(tag, expectedTag)) {
                throw new Error("Sai mật khẩu hoặc tệp đã bị thay đổi (ChaCha20-Poly1305 Tag không khớp).");
            }
            return this.process(key, 1, nonce, ciphertext);
        }
    };

    // PKCS#7 padding for AES-CBC
    function pkcs7Pad(data) {
        const padLen = 16 - (data.length % 16);
        const out = new Uint8Array(data.length + padLen);
        out.set(data, 0);
        out.fill(padLen, data.length);
        return out;
    }

    function pkcs7Unpad(data) {
        if (data.length === 0 || data.length % 16 !== 0) throw new Error("Kích thước bản mã CBC không hợp lệ.");
        const padLen = data[data.length - 1];
        if (padLen <= 0 || padLen > 16) throw new Error("Padding PKCS#7 không hợp lệ.");
        for (let i = data.length - padLen; i < data.length; i++) {
            if (data[i] !== padLen) throw new Error("Padding PKCS#7 không hợp lệ.");
        }
        return data.subarray(0, data.length - padLen);
    }

    // Helper: calculate HMAC-SHA256
    async function computeHmacSha256(keyBytes, data) {
        if (isBrowser) {
            const hmacKey = await window.crypto.subtle.importKey(
                "raw",
                keyBytes,
                { name: "HMAC", hash: "SHA-256" },
                false,
                ["sign"]
            );
            const sig = await window.crypto.subtle.sign("HMAC", hmacKey, data);
            return new Uint8Array(sig);
        } else if (nodeCrypto) {
            const hmac = nodeCrypto.createHmac('sha256', Buffer.from(keyBytes));
            hmac.update(Buffer.from(data));
            return new Uint8Array(hmac.digest());
        }
        throw new Error("Không thể tính HMAC-SHA256.");
    }

    // Core Encrypt
    async function encryptFile(data, fileName, mimeType, password, algorithm, onProgress) {
        if (!data || !(data instanceof Uint8Array)) {
            throw new Error("Dữ liệu đầu vào phải là Uint8Array.");
        }
        if (!password) {
            throw new Error("Mật khẩu không được để trống.");
        }
        algorithm = Number(algorithm) || Algorithm.Aes256Gcm;
        if (!AlgorithmNames[algorithm]) {
            throw new Error("Thuật toán không được hỗ trợ.");
        }

        const isAead = (algorithm === Algorithm.Aes256Gcm || algorithm === Algorithm.ChaCha20Poly1305);
        const salt = getRandomBytes(SALT_SIZE);
        const ivLen = isAead ? 12 : 16;
        const iv = getRandomBytes(ivLen);

        if (onProgress) onProgress(0.1, "Đang dẫn xuất khóa (PBKDF2 200.000 vòng)...");
        const keyMaterial = await deriveKeyBytes(password, salt, isAead ? 32 : 64);

        if (onProgress) onProgress(0.4, "Đang đóng gói metadata FCQ2...");

        const nameBytes = new TextEncoder().encode(fileName || "unnamed");
        const mimeBytes = new TextEncoder().encode(mimeType || "application/octet-stream");

        // FCQ2 Header:
        // 'FCQ2' (4) + alg (1) + salt (16) + ivLen (1) + iv (ivLen) + nameLen (2 BE) + name + mimeLen (2 BE) + mime
        const headerLen = 4 + 1 + 16 + 1 + ivLen + 2 + nameBytes.length + 2 + mimeBytes.length;
        const header = new Uint8Array(headerLen);
        let pos = 0;
        header.set(new TextEncoder().encode("FCQ2"), pos); pos += 4;
        header[pos++] = algorithm;
        header.set(salt, pos); pos += 16;
        header[pos++] = ivLen;
        header.set(iv, pos); pos += ivLen;

        const dv = new DataView(header.buffer, header.byteOffset, header.byteLength);
        dv.setUint16(pos, nameBytes.length, false); pos += 2;
        header.set(nameBytes, pos); pos += nameBytes.length;
        dv.setUint16(pos, mimeBytes.length, false); pos += 2;
        header.set(mimeBytes, pos); pos += mimeBytes.length;

        let ciphertext, tagOrMac;

        if (onProgress) onProgress(0.6, `Đang mã hóa với ${AlgorithmNames[algorithm]}...`);

        if (algorithm === Algorithm.Aes256Gcm) {
            if (isBrowser) {
                const aesKey = await window.crypto.subtle.importKey(
                    "raw",
                    keyMaterial,
                    { name: "AES-GCM" },
                    false,
                    ["encrypt"]
                );
                const encryptedBuf = await window.crypto.subtle.encrypt(
                    {
                        name: "AES-GCM",
                        iv: iv,
                        additionalData: header,
                        tagLength: 128
                    },
                    aesKey,
                    data
                );
                const encArr = new Uint8Array(encryptedBuf);
                ciphertext = encArr.subarray(0, encArr.length - TAG_SIZE);
                tagOrMac = encArr.subarray(encArr.length - TAG_SIZE);
            } else if (nodeCrypto) {
                const cipher = nodeCrypto.createCipheriv('aes-256-gcm', Buffer.from(keyMaterial), Buffer.from(iv));
                cipher.setAAD(Buffer.from(header));
                ciphertext = new Uint8Array(Buffer.concat([cipher.update(Buffer.from(data)), cipher.final()]));
                tagOrMac = new Uint8Array(cipher.getAuthTag());
            }
        } else if (algorithm === Algorithm.ChaCha20Poly1305) {
            const res = ChaCha20Poly1305.encrypt(keyMaterial, iv, data, header);
            ciphertext = res.ciphertext;
            tagOrMac = res.tag;
        } else if (algorithm === Algorithm.Aes256Cbc) {
            const aesKeyBytes = keyMaterial.subarray(0, 32);
            const hmacKeyBytes = keyMaterial.subarray(32, 64);
            const padded = pkcs7Pad(data);

            if (isBrowser) {
                const aesKey = await window.crypto.subtle.importKey(
                    "raw",
                    aesKeyBytes,
                    { name: "AES-CBC" },
                    false,
                    ["encrypt"]
                );
                // subtle.encrypt in browser adds its own PKCS7 padding unless we do it carefully.
                // In subtle.encrypt("AES-CBC", ...), it automatically adds PKCS#7 to unpadded data!
                // To avoid double padding in browser: pass raw data to subtle.encrypt!
                const encBuf = await window.crypto.subtle.encrypt(
                    { name: "AES-CBC", iv: iv },
                    aesKey,
                    data
                );
                ciphertext = new Uint8Array(encBuf);
            } else if (nodeCrypto) {
                const cipher = nodeCrypto.createCipheriv('aes-256-cbc', Buffer.from(aesKeyBytes), Buffer.from(iv));
                ciphertext = new Uint8Array(Buffer.concat([cipher.update(Buffer.from(data)), cipher.final()]));
            }

            // Encrypt-then-MAC: HMAC covers header + ciphertext
            const hmacInput = new Uint8Array(header.length + ciphertext.length);
            hmacInput.set(header, 0);
            hmacInput.set(ciphertext, header.length);
            tagOrMac = await computeHmacSha256(hmacKeyBytes, hmacInput);
        }

        if (onProgress) onProgress(0.9, "Đang hoàn thiện tệp kết quả...");

        const totalLen = header.length + ciphertext.length + tagOrMac.length;
        const result = new Uint8Array(totalLen);
        result.set(header, 0);
        result.set(ciphertext, header.length);
        result.set(tagOrMac, header.length + ciphertext.length);

        if (onProgress) onProgress(1.0, "Mã hóa thành công!");
        return result;
    }

    // Inspect FCQ Header without decryption
    function inspectFile(fcqData) {
        if (!fcqData || fcqData.length < 37) {
            throw new Error("Tệp không đúng định dạng FileCryptoQt hoặc kích thước quá nhỏ.");
        }
        const magic = new TextDecoder('ascii').decode(fcqData.subarray(0, 4));
        if (magic === "FCQ1") {
            const algorithm = fcqData[4];
            const salt = fcqData.subarray(5, 21);
            const iv = fcqData.subarray(21, 37);
            const isAead = (algorithm !== Algorithm.Aes256Cbc);
            const authSize = isAead ? 16 : 0;
            return {
                version: 1,
                magic: "FCQ1",
                algorithm: algorithm,
                algorithmName: AlgorithmNames[algorithm] || "Không xác định",
                originalName: "",
                mimeType: "application/octet-stream",
                salt: salt,
                iv: iv,
                headerLength: 37,
                authSize: authSize,
                payloadSize: Math.max(0, fcqData.length - 37 - authSize),
                authenticated: isAead
            };
        } else if (magic === "FCQ2") {
            const algorithm = fcqData[4];
            const salt = fcqData.subarray(5, 21);
            const ivLen = fcqData[21];
            if (ivLen < 12 || ivLen > 16) throw new Error("Độ dài IV không hợp lệ.");
            let pos = 22;
            const iv = fcqData.subarray(pos, pos + ivLen);
            pos += ivLen;

            const dv = new DataView(fcqData.buffer, fcqData.byteOffset, fcqData.byteLength);
            const nameLen = dv.getUint16(pos, false); pos += 2;
            const originalName = new TextDecoder('utf8').decode(fcqData.subarray(pos, pos + nameLen)); pos += nameLen;
            const mimeLen = dv.getUint16(pos, false); pos += 2;
            const mimeType = new TextDecoder('utf8').decode(fcqData.subarray(pos, pos + mimeLen)); pos += mimeLen;

            const isAead = (algorithm === Algorithm.Aes256Gcm || algorithm === Algorithm.ChaCha20Poly1305);
            const authSize = isAead ? TAG_SIZE : MAC_SIZE;
            const headerLength = pos;
            const payloadSize = Math.max(0, fcqData.length - headerLength - authSize);

            return {
                version: 2,
                magic: "FCQ2",
                algorithm: algorithm,
                algorithmName: AlgorithmNames[algorithm] || "Không xác định",
                originalName: originalName,
                mimeType: mimeType || "application/octet-stream",
                salt: salt,
                iv: iv,
                headerLength: headerLength,
                authSize: authSize,
                payloadSize: payloadSize,
                authenticated: true
            };
        } else {
            throw new Error("Tệp không đúng định dạng FileCryptoQt (Magic Header phải là FCQ1 hoặc FCQ2).");
        }
    }

    // Core Decrypt
    async function decryptFile(fcqData, password, onProgress) {
        if (!fcqData || !(fcqData instanceof Uint8Array)) {
            throw new Error("Dữ liệu đầu vào phải là Uint8Array.");
        }
        if (!password) {
            throw new Error("Mật khẩu không được để trống.");
        }

        const info = inspectFile(fcqData);

        if (onProgress) onProgress(0.1, "Đang phân tích cấu trúc FCQ...");
        const header = fcqData.subarray(0, info.headerLength);
        const payloadEnd = fcqData.length - info.authSize;
        if (payloadEnd < info.headerLength) {
            throw new Error("Tệp mã hóa bị hỏng hoặc thiếu dữ liệu payload.");
        }

        const ciphertext = fcqData.subarray(info.headerLength, payloadEnd);
        const authTag = info.authSize > 0 ? fcqData.subarray(payloadEnd) : new Uint8Array(0);

        if (onProgress) onProgress(0.2, "Đang dẫn xuất khóa (PBKDF2 200.000 vòng)...");
        const keyMaterial = await deriveKeyBytes(
            password,
            info.salt,
            (info.version === 2 && info.algorithm === Algorithm.Aes256Cbc) ? 64 : 32
        );

        if (onProgress) onProgress(0.5, `Đang giải mã và kiểm tra toàn vẹn (${info.algorithmName})...`);

        let plaintext;

        if (info.algorithm === Algorithm.Aes256Gcm) {
            const iv = info.version === 1 ? info.iv.subarray(0, 12) : info.iv;
            if (isBrowser) {
                const aesKey = await window.crypto.subtle.importKey(
                    "raw",
                    keyMaterial,
                    { name: "AES-GCM" },
                    false,
                    ["decrypt"]
                );
                // Recombine ciphertext + 16-byte tag for Web Crypto subtle.decrypt
                const combined = new Uint8Array(ciphertext.length + authTag.length);
                combined.set(ciphertext, 0);
                combined.set(authTag, ciphertext.length);

                try {
                    const decryptedBuf = await window.crypto.subtle.decrypt(
                        {
                            name: "AES-GCM",
                            iv: iv,
                            additionalData: info.version === 2 ? header : undefined,
                            tagLength: 128
                        },
                        aesKey,
                        combined
                    );
                    plaintext = new Uint8Array(decryptedBuf);
                } catch (e) {
                    throw new Error("Sai mật khẩu hoặc tệp đã bị thay đổi (AES-GCM xác thực thất bại).");
                }
            } else if (nodeCrypto) {
                try {
                    const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', Buffer.from(keyMaterial), Buffer.from(iv));
                    if (info.version === 2) decipher.setAAD(Buffer.from(header));
                    decipher.setAuthTag(Buffer.from(authTag));
                    plaintext = new Uint8Array(Buffer.concat([decipher.update(Buffer.from(ciphertext)), decipher.final()]));
                } catch (e) {
                    throw new Error("Sai mật khẩu hoặc tệp đã bị thay đổi (AES-GCM xác thực thất bại).");
                }
            }
        } else if (info.algorithm === Algorithm.ChaCha20Poly1305) {
            const iv = info.version === 1 ? info.iv.subarray(0, 12) : info.iv;
            plaintext = ChaCha20Poly1305.decrypt(keyMaterial, iv, ciphertext, authTag, info.version === 2 ? header : new Uint8Array(0));
        } else if (info.algorithm === Algorithm.Aes256Cbc) {
            if (info.version === 2) {
                const aesKeyBytes = keyMaterial.subarray(0, 32);
                const hmacKeyBytes = keyMaterial.subarray(32, 64);

                // Verify HMAC first (Encrypt-then-MAC)
                const hmacInput = new Uint8Array(header.length + ciphertext.length);
                hmacInput.set(header, 0);
                hmacInput.set(ciphertext, header.length);
                const expectedMac = await computeHmacSha256(hmacKeyBytes, hmacInput);

                if (!constantTimeCompare(authTag, expectedMac)) {
                    throw new Error("Sai mật khẩu hoặc tệp đã bị thay đổi (HMAC-SHA256 không khớp).");
                }

                if (isBrowser) {
                    const aesKey = await window.crypto.subtle.importKey(
                        "raw",
                        aesKeyBytes,
                        { name: "AES-CBC" },
                        false,
                        ["decrypt"]
                    );
                    try {
                        const decBuf = await window.crypto.subtle.decrypt(
                            { name: "AES-CBC", iv: info.iv },
                            aesKey,
                            ciphertext
                        );
                        plaintext = new Uint8Array(decBuf);
                    } catch (e) {
                        throw new Error("Sai mật khẩu hoặc tệp đã bị thay đổi (Giải mã CBC thất bại).");
                    }
                } else if (nodeCrypto) {
                    try {
                        const decipher = nodeCrypto.createDecipheriv('aes-256-cbc', Buffer.from(aesKeyBytes), Buffer.from(info.iv));
                        plaintext = new Uint8Array(Buffer.concat([decipher.update(Buffer.from(ciphertext)), decipher.final()]));
                    } catch (e) {
                        throw new Error("Sai mật khẩu hoặc tệp đã bị thay đổi (Giải mã CBC thất bại).");
                    }
                }
            } else {
                // FCQ1 CBC (unauthenticated)
                if (isBrowser) {
                    const aesKey = await window.crypto.subtle.importKey(
                        "raw",
                        keyMaterial.subarray(0, 32),
                        { name: "AES-CBC" },
                        false,
                        ["decrypt"]
                    );
                    try {
                        const decBuf = await window.crypto.subtle.decrypt(
                            { name: "AES-CBC", iv: info.iv },
                            aesKey,
                            ciphertext
                        );
                        plaintext = new Uint8Array(decBuf);
                    } catch (e) {
                        throw new Error("Sai mật khẩu hoặc tệp FCQ1 bị hỏng.");
                    }
                } else if (nodeCrypto) {
                    try {
                        const decipher = nodeCrypto.createDecipheriv('aes-256-cbc', Buffer.from(keyMaterial.subarray(0, 32)), Buffer.from(info.iv));
                        plaintext = new Uint8Array(Buffer.concat([decipher.update(Buffer.from(ciphertext)), decipher.final()]));
                    } catch (e) {
                        throw new Error("Sai mật khẩu hoặc tệp FCQ1 bị hỏng.");
                    }
                }
            }
        }

        if (onProgress) onProgress(1.0, "Giải mã thành công!");

        return {
            plaintext: plaintext,
            originalName: info.originalName,
            mimeType: info.mimeType,
            algorithm: info.algorithm,
            algorithmName: info.algorithmName,
            version: info.version
        };
    }

    function bytesToHex(bytes) {
        if (!bytes) return '';
        const hex = [];
        for (let i = 0; i < bytes.length; i++) {
            hex.push(bytes[i].toString(16).padStart(2, '0').toUpperCase());
        }
        return hex.join(' ');
    }

    function hexToBytes(hex) {
        if (!hex) return new Uint8Array(0);
        const clean = hex.replace(/[^0-9a-fA-F]/g, '');
        const bytes = new Uint8Array(Math.floor(clean.length / 2));
        for (let i = 0; i < clean.length - 1; i += 2) {
            bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
        }
        return bytes;
    }

    function bytesToBase64(bytes) {
        if (!bytes) return '';
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        if (typeof btoa !== 'undefined') {
            return btoa(binary);
        }
        return Buffer.from(bytes).toString('base64');
    }

    function base64ToBytes(b64) {
        if (!b64) return new Uint8Array(0);
        const clean = b64.replace(/\s+/g, '');
        if (typeof atob !== 'undefined') {
            const binary = atob(clean);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        }
        return new Uint8Array(Buffer.from(clean, 'base64'));
    }

    async function derivePbkdf2Bytes(password, salt, length, iterations) {
        const passBytes = new TextEncoder().encode(password);
        if (isBrowser) {
            const baseKey = await window.crypto.subtle.importKey(
                "raw",
                passBytes,
                { name: "PBKDF2" },
                false,
                ["deriveBits"]
            );
            const bits = await window.crypto.subtle.deriveBits(
                {
                    name: "PBKDF2",
                    salt: salt,
                    iterations: iterations,
                    hash: "SHA-256"
                },
                baseKey,
                length * 8
            );
            return new Uint8Array(bits);
        } else if (nodeCrypto) {
            return new Promise((resolve, reject) => {
                nodeCrypto.pbkdf2(
                    Buffer.from(passBytes),
                    Buffer.from(salt),
                    iterations,
                    length,
                    'sha256',
                    (err, key) => {
                        if (err) reject(err);
                        else resolve(new Uint8Array(key));
                    }
                );
            });
        }
        throw new Error("Không hỗ trợ CSPRNG/WebCrypto.");
    }

    async function encryptText(plainText, password, alg = Algorithm.Aes256Cbc, useBase64 = true) {
        if (!password) {
            return { ok: false, error: "Vui lòng nhập mật khẩu mã hóa." };
        }
        if (!plainText) {
            return { ok: false, error: "Văn bản đầu vào trống." };
        }

        const plainBytes = new TextEncoder().encode(plainText);

        try {
            if (alg === Algorithm.Aes256Cbc) {
                // OpenSSL CLI compatible mode: Salted__ + 8 bytes salt + 10,000 PBKDF2 iterations
                const salt = getRandomBytes(8);
                const kiv = await derivePbkdf2Bytes(password, salt, 48, 10000);
                const keyBytes = kiv.subarray(0, 32);
                const ivBytes = kiv.subarray(32, 48);

                let encryptedBytes;
                if (isBrowser) {
                    const aesKey = await window.crypto.subtle.importKey(
                        "raw",
                        keyBytes,
                        { name: "AES-CBC" },
                        false,
                        ["encrypt"]
                    );
                    const encBuf = await window.crypto.subtle.encrypt(
                        { name: "AES-CBC", iv: ivBytes },
                        aesKey,
                        plainBytes
                    );
                    encryptedBytes = new Uint8Array(encBuf);
                } else if (nodeCrypto) {
                    const cipher = nodeCrypto.createCipheriv('aes-256-cbc', Buffer.from(keyBytes), Buffer.from(ivBytes));
                    encryptedBytes = new Uint8Array(Buffer.concat([cipher.update(Buffer.from(plainBytes)), cipher.final()]));
                }

                const magic = new TextEncoder().encode("Salted__");
                const container = new Uint8Array(magic.length + salt.length + encryptedBytes.length);
                container.set(magic, 0);
                container.set(salt, magic.length);
                container.set(encryptedBytes, magic.length + salt.length);

                return {
                    ok: true,
                    rawCipher: container,
                    hexString: bytesToHex(container),
                    base64String: bytesToBase64(container)
                };
            } else if (alg === Algorithm.Aes256Gcm) {
                const salt = getRandomBytes(16);
                const iv = getRandomBytes(12);
                const key = await deriveKeyBytes(password, salt, 32);

                let encryptedBytes;
                if (isBrowser) {
                    const aesKey = await window.crypto.subtle.importKey(
                        "raw",
                        key,
                        { name: "AES-GCM" },
                        false,
                        ["encrypt"]
                    );
                    const encBuf = await window.crypto.subtle.encrypt(
                        { name: "AES-GCM", iv: iv, tagLength: 128 },
                        aesKey,
                        plainBytes
                    );
                    encryptedBytes = new Uint8Array(encBuf);
                } else if (nodeCrypto) {
                    const cipher = nodeCrypto.createCipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(iv));
                    const part1 = cipher.update(Buffer.from(plainBytes));
                    const part2 = cipher.final();
                    const tag = cipher.getAuthTag();
                    encryptedBytes = new Uint8Array(Buffer.concat([part1, part2, tag]));
                }

                const tag = encryptedBytes.subarray(encryptedBytes.length - 16);
                const cipher = encryptedBytes.subarray(0, encryptedBytes.length - 16);

                const magic = new TextEncoder().encode("FCQGCM");
                const container = new Uint8Array(magic.length + salt.length + iv.length + tag.length + cipher.length);
                let offset = 0;
                container.set(magic, offset); offset += magic.length;
                container.set(salt, offset); offset += salt.length;
                container.set(iv, offset); offset += iv.length;
                container.set(tag, offset); offset += tag.length;
                container.set(cipher, offset);

                return {
                    ok: true,
                    rawCipher: container,
                    hexString: bytesToHex(container),
                    base64String: bytesToBase64(container)
                };
            } else {
                // ChaCha20-Poly1305
                const salt = getRandomBytes(16);
                const iv = getRandomBytes(12);
                const key = await deriveKeyBytes(password, salt, 32);
                const res = ChaCha20Poly1305.encrypt(key, iv, plainBytes, new Uint8Array(0));

                const magic = new TextEncoder().encode("FCQCHA");
                const container = new Uint8Array(magic.length + salt.length + iv.length + res.tag.length + res.ciphertext.length);
                let offset = 0;
                container.set(magic, offset); offset += magic.length;
                container.set(salt, offset); offset += salt.length;
                container.set(iv, offset); offset += iv.length;
                container.set(res.tag, offset); offset += res.tag.length;
                container.set(res.ciphertext, offset);

                return {
                    ok: true,
                    rawCipher: container,
                    hexString: bytesToHex(container),
                    base64String: bytesToBase64(container)
                };
            }
        } catch (e) {
            return { ok: false, error: "Mã hóa văn bản thất bại: " + (e.message || e.toString()) };
        }
    }

    async function decryptText(cipherInput, password) {
        if (!password) {
            throw new Error("Vui lòng nhập mật khẩu giải mã.");
        }
        if (!cipherInput || !cipherInput.trim()) {
            throw new Error("Dữ liệu bản mã trống.");
        }

        const trimmed = cipherInput.trim();
        const noSpaces = trimmed.replace(/\s+/g, '');

        let raw = null;
        try {
            const b64Candidate = base64ToBytes(noSpaces);
            const strCheck = new TextDecoder().decode(b64Candidate.subarray(0, 8));
            if (strCheck.startsWith("Salted__") || strCheck.startsWith("FCQ")) {
                raw = b64Candidate;
            }
        } catch (e) { }

        if (!raw) {
            try {
                const hexCandidate = hexToBytes(noSpaces);
                const strCheck = new TextDecoder().decode(hexCandidate.subarray(0, 8));
                if (strCheck.startsWith("Salted__") || strCheck.startsWith("FCQ")) {
                    raw = hexCandidate;
                } else if (hexCandidate.length >= 16) {
                    raw = hexCandidate;
                }
            } catch (e) { }
        }

        if (!raw) {
            raw = base64ToBytes(noSpaces);
        }

        if (raw.length < 16) {
            throw new Error("Bản mã không đủ độ dài hợp lệ.");
        }

        const magic = new TextDecoder().decode(raw.subarray(0, 8));
        if (magic.startsWith("Salted__")) {
            const salt = raw.subarray(8, 16);
            const cipher = raw.subarray(16);

            const itersList = [10000, 200000];
            for (const iters of itersList) {
                try {
                    const kiv = await derivePbkdf2Bytes(password, salt, 48, iters);
                    const keyBytes = kiv.subarray(0, 32);
                    const ivBytes = kiv.subarray(32, 48);

                    if (isBrowser) {
                        const aesKey = await window.crypto.subtle.importKey(
                            "raw",
                            keyBytes,
                            { name: "AES-CBC" },
                            false,
                            ["decrypt"]
                        );
                        const decBuf = await window.crypto.subtle.decrypt(
                            { name: "AES-CBC", iv: ivBytes },
                            aesKey,
                            cipher
                        );
                        return new TextDecoder().decode(decBuf);
                    } else if (nodeCrypto) {
                        const decipher = nodeCrypto.createDecipheriv('aes-256-cbc', Buffer.from(keyBytes), Buffer.from(ivBytes));
                        const decBuf = Buffer.concat([decipher.update(Buffer.from(cipher)), decipher.final()]);
                        return decBuf.toString('utf8');
                    }
                } catch (e) {
                    // Tiếp tục thử số vòng lặp tiếp theo
                }
            }
            throw new Error("Sai mật khẩu hoặc dữ liệu bản mã đã bị thay đổi.");
        } else if (magic.startsWith("FCQGCM") || magic.startsWith("FCQCHA")) {
            const isGcm = magic.startsWith("FCQGCM");
            if (raw.length < 6 + 16 + 12 + TAG_SIZE) {
                throw new Error("Bản mã AEAD bị thiếu dữ liệu.");
            }

            const salt = raw.subarray(6, 22);
            const iv = raw.subarray(22, 34);
            const tag = raw.subarray(34, 34 + TAG_SIZE);
            const cipher = raw.subarray(34 + TAG_SIZE);

            const key = await deriveKeyBytes(password, salt, 32);

            if (isGcm) {
                const combined = new Uint8Array(cipher.length + tag.length);
                combined.set(cipher, 0);
                combined.set(tag, cipher.length);

                if (isBrowser) {
                    try {
                        const aesKey = await window.crypto.subtle.importKey(
                            "raw",
                            key,
                            { name: "AES-GCM" },
                            false,
                            ["decrypt"]
                        );
                        const decBuf = await window.crypto.subtle.decrypt(
                            { name: "AES-GCM", iv: iv, tagLength: 128 },
                            aesKey,
                            combined
                        );
                        return new TextDecoder().decode(decBuf);
                    } catch (e) {
                        throw new Error("Sai mật khẩu hoặc bản mã AEAD đã bị sửa đổi.");
                    }
                } else if (nodeCrypto) {
                    try {
                        const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(iv));
                        decipher.setAuthTag(Buffer.from(tag));
                        const decBuf = Buffer.concat([decipher.update(Buffer.from(cipher)), decipher.final()]);
                        return decBuf.toString('utf8');
                    } catch (e) {
                        throw new Error("Sai mật khẩu hoặc bản mã AEAD đã bị sửa đổi.");
                    }
                }
            } else {
                // ChaCha20-Poly1305
                const plain = ChaCha20Poly1305.decrypt(key, iv, cipher, tag, new Uint8Array(0));
                return new TextDecoder().decode(plain);
            }
        }

        throw new Error("Định dạng bản mã không được nhận diện (cần tiền tố Salted__, FCQGCM hoặc FCQCHA).");
    }

    function suggestedEncryptedPath(name) {
        return (name || "encrypted") + ".fcq";
    }

    function suggestedDecryptedPath(currentName, originalName) {
        if (originalName && originalName.trim().length > 0) {
            return "restored_" + originalName.trim();
        }
        let base = currentName || "restored_file";
        if (base.toLowerCase().endsWith(".fcq")) {
            base = base.substring(0, base.length - 4);
        }
        return base + ".decrypted";
    }

    return {
        Algorithm,
        AlgorithmNames,
        encryptFile,
        decryptFile,
        inspectFile,
        encryptText,
        decryptText,
        bytesToHex,
        hexToBytes,
        bytesToBase64,
        base64ToBytes,
        suggestedEncryptedPath,
        suggestedDecryptedPath,
        ChaCha20Poly1305,
        deriveKeyBytes,
        getRandomBytes
    };
}));
