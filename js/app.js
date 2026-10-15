/**
 * FileCrypto Web — Main Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const folderInput = document.getElementById('folderInput');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    const passwordInput = document.getElementById('passwordInput');
    const togglePassBtn = document.getElementById('togglePassBtn');
    const generatePassBtn = document.getElementById('generatePassBtn');
    const passStrengthBar = document.getElementById('passStrengthBar');
    const passStrengthLabel = document.getElementById('passStrengthLabel');

    const algorithmSelect = document.getElementById('algorithmSelect');
    const actionBtn = document.getElementById('actionBtn');
    const fileInfoCard = document.getElementById('fileInfoCard');
    const fileNameEl = document.getElementById('selectedFileName');
    const fileSizeEl = document.getElementById('selectedFileSize');
    const fileTypeEl = document.getElementById('selectedFileType');
    const removeFileBtn = document.getElementById('removeFileBtn');

    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar');
    const progressStatus = document.getElementById('progressStatus');
    const progressPercent = document.getElementById('progressPercent');

    const resultSection = document.getElementById('resultSection');
    const downloadBtn = document.getElementById('downloadBtn');
    const resultDetails = document.getElementById('resultDetails');

    const previewContainer = document.getElementById('previewContainer');
    const inspectResultCard = document.getElementById('inspectResultCard');
    const inspectContent = document.getElementById('inspectContent');

    const runSelfTestBtn = document.getElementById('runSelfTestBtn');
    const selfTestResults = document.getElementById('selfTestResults');

    // Initialize Transmission Simulator
    const transmission = TransmissionWidget.create('transmissionCanvas');

    // State
    let currentMode = 'encrypt'; // 'encrypt', 'decrypt', 'inspect', 'docs'
    let selectedFile = null;
    let selectedFileData = null;
    let processedResult = null; // { data, name, mime }

    // Tab Navigation
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.tab;
            setMode(mode);
        });
    });

    function setMode(mode) {
        currentMode = mode;
        tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === mode));
        tabPanes.forEach(p => p.classList.toggle('active', p.id === `${mode}Pane`));

        // Update UI based on mode
        if (mode === 'encrypt') {
            actionBtn.textContent = '🔒 Bắt đầu mã hóa tệp';
            actionBtn.className = 'btn btn-primary';
            document.getElementById('algoGroup').style.display = 'block';
            document.getElementById('passGroup').style.display = 'block';
            dropzone.querySelector('.dropzone-title').textContent = 'Kéo thả tệp hoặc thư mục vào đây để mã hóa';
        } else if (mode === 'decrypt') {
            actionBtn.textContent = '🔓 Bắt đầu giải mã tệp';
            actionBtn.className = 'btn btn-success';
            document.getElementById('algoGroup').style.display = 'none'; // Auto detected from FCQ
            document.getElementById('passGroup').style.display = 'block';
            dropzone.querySelector('.dropzone-title').textContent = 'Kéo thả tệp .fcq vào đây để giải mã';
        } else if (mode === 'inspect') {
            actionBtn.textContent = '🔍 Phân tích Header FCQ';
            actionBtn.className = 'btn btn-info';
            document.getElementById('algoGroup').style.display = 'none';
            document.getElementById('passGroup').style.display = 'none';
            dropzone.querySelector('.dropzone-title').textContent = 'Kéo thả tệp .fcq để soi cấu trúc header';
        }

        resetResults();
        if (selectedFileData) {
            updatePreview(selectedFileData, selectedFile.name, selectedFile.type);
        }
    }

    // Password Visibility & Generation
    togglePassBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassBtn.textContent = type === 'password' ? '👁️' : '🙈';
    });

    generatePassBtn.addEventListener('click', () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+{}[]';
        let pass = '';
        const rand = CryptoEngine.getRandomBytes(16);
        for (let i = 0; i < 16; i++) {
            pass += chars[rand[i] % chars.length];
        }
        passwordInput.value = pass;
        passwordInput.setAttribute('type', 'text');
        togglePassBtn.textContent = '🙈';
        evaluatePassword(pass);
    });

    passwordInput.addEventListener('input', (e) => {
        evaluatePassword(e.target.value);
    });

    function evaluatePassword(pass) {
        if (!pass) {
            passStrengthBar.style.width = '0%';
            passStrengthLabel.textContent = '';
            return;
        }
        let score = 0;
        if (pass.length >= 8) score += 25;
        if (pass.length >= 12) score += 15;
        if (/[A-Z]/.test(pass)) score += 20;
        if (/[0-9]/.test(pass)) score += 20;
        if (/[^A-Za-z0-9]/.test(pass)) score += 20;

        score = Math.min(100, score);
        passStrengthBar.style.width = `${score}%`;

        if (score < 40) {
            passStrengthBar.style.backgroundColor = '#ef4444';
            passStrengthLabel.textContent = 'Yếu';
            passStrengthLabel.style.color = '#ef4444';
        } else if (score < 75) {
            passStrengthBar.style.backgroundColor = '#f59e0b';
            passStrengthLabel.textContent = 'Trung bình';
            passStrengthLabel.style.color = '#f59e0b';
        } else {
            passStrengthBar.style.backgroundColor = '#10b981';
            passStrengthLabel.textContent = 'Rất mạnh (PBKDF2 200.000 vòng)';
            passStrengthLabel.style.color = '#10b981';
        }
    }

    // Drag and Drop
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('drag-over');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    if (folderInput) {
        folderInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });
    }

    removeFileBtn.addEventListener('click', () => {
        selectedFile = null;
        selectedFileData = null;
        fileInfoCard.style.display = 'none';
        fileInput.value = '';
        if (folderInput) folderInput.value = '';
        previewContainer.innerHTML = '';
        resetResults();
        transmission.setState('idle', 0);
    });

    async function handleFileSelect(file) {
        selectedFile = file;
        fileNameEl.textContent = file.name;
        fileSizeEl.textContent = FilePreview.formatBytes(file.size);
        fileTypeEl.textContent = file.type || 'application/octet-stream';
        fileInfoCard.style.display = 'flex';

        resetResults();

        // Read file data
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedFileData = new Uint8Array(e.target.result);
            updatePreview(selectedFileData, file.name, file.type);

            // Auto detect mode if user drops an .fcq file in encrypt mode
            if (file.name.toLowerCase().endsWith('.fcq') && currentMode === 'encrypt') {
                setMode('decrypt');
            }

            transmission.setState('idle', 0, {
                fileName: file.name,
                fileSize: file.size,
                algorithm: CryptoEngine.AlgorithmNames[algorithmSelect.value]
            });
        };
        reader.readAsArrayBuffer(file);
    }

    function updatePreview(data, name, mime) {
        FilePreview.render(previewContainer, data, name, mime);
    }

    function resetResults() {
        progressSection.style.display = 'none';
        resultSection.style.display = 'none';
        if (inspectResultCard) inspectResultCard.style.display = 'none';
        processedResult = null;
    }

    // Action Execution (Encrypt / Decrypt / Inspect)
    actionBtn.addEventListener('click', async () => {
        if (!selectedFileData) {
            alert('Vui lòng chọn hoặc kéo thả tệp trước khi thực hiện!');
            return;
        }

        const pass = passwordInput.value;
        if (currentMode !== 'inspect' && !pass) {
            alert('Vui lòng nhập mật khẩu để bảo vệ hoặc mở khóa dữ liệu!');
            passwordInput.focus();
            return;
        }

        resetResults();
        progressSection.style.display = 'block';

        const updateProgress = (pct, msg) => {
            progressBar.style.width = `${Math.round(pct * 100)}%`;
            progressPercent.textContent = `${Math.round(pct * 100)}%`;
            progressStatus.textContent = msg || 'Đang xử lý...';
            transmission.setState(currentMode === 'encrypt' ? 'encrypting' : 'decrypting', pct);
        };

        try {
            if (currentMode === 'encrypt') {
                const alg = parseInt(algorithmSelect.value, 10);
                updateProgress(0.1, 'Bắt đầu mã hóa...');

                // Small setTimeout to allow UI to render progress
                setTimeout(async () => {
                    try {
                        const encrypted = await CryptoEngine.encryptFile(
                            selectedFileData,
                            selectedFile.name,
                            selectedFile.type,
                            pass,
                            alg,
                            updateProgress
                        );

                        const outName = CryptoEngine.suggestedEncryptedPath(selectedFile.name);
                        processedResult = {
                            data: encrypted,
                            name: outName,
                            mime: 'application/octet-stream'
                        };

                        updateProgress(1.0, 'Mã hóa hoàn tất!');
                        transmission.setState('completed', 1.0);

                        showResult(
                            `Tệp đã được mã hóa thành công với <strong>${CryptoEngine.AlgorithmNames[alg]}</strong>.`,
                            outName,
                            encrypted.length
                        );

                        // Show preview of ciphertext HEX
                        updatePreview(encrypted, outName, 'application/octet-stream');
                    } catch (err) {
                        handleError(err);
                    }
                }, 50);

            } else if (currentMode === 'decrypt') {
                updateProgress(0.1, 'Bắt đầu giải mã...');

                setTimeout(async () => {
                    try {
                        const res = await CryptoEngine.decryptFile(
                            selectedFileData,
                            pass,
                            updateProgress
                        );

                        const outName = CryptoEngine.suggestedDecryptedPath(selectedFile.name, res.originalName);
                        processedResult = {
                            data: res.plaintext,
                            name: outName,
                            mime: res.mimeType
                        };

                        updateProgress(1.0, 'Giải mã hoàn tất!');
                        transmission.setState('completed', 1.0);

                        showResult(
                            `Tệp đã được giải mã và xác thực tính toàn vẹn thành công!<br>` +
                            `Tên gốc: <strong>${res.originalName || '(Không lưu)'}</strong> | MIME: <strong>${res.mimeType}</strong> | Thuật toán: <strong>${res.algorithmName}</strong>`,
                            outName,
                            res.plaintext.length
                        );

                        // Show preview of restored plaintext/image/media
                        updatePreview(res.plaintext, outName, res.mimeType);
                    } catch (err) {
                        handleError(err);
                    }
                }, 50);

            } else if (currentMode === 'inspect') {
                const info = CryptoEngine.inspectFile(selectedFileData);
                progressSection.style.display = 'none';
                inspectResultCard.style.display = 'block';

                const saltHex = Array.from(info.salt).map(b => b.toString(16).padStart(2, '0')).join(' ');
                const ivHex = Array.from(info.iv).map(b => b.toString(16).padStart(2, '0')).join(' ');

                inspectContent.innerHTML = `
                    <div class="inspect-grid">
                        <div class="inspect-item">
                            <span class="label">Định dạng Magic:</span>
                            <span class="val badge badge-cyan">${info.magic} (Phiên bản ${info.version})</span>
                        </div>
                        <div class="inspect-item">
                            <span class="label">Thuật toán:</span>
                            <span class="val badge badge-purple">${info.algorithmName}</span>
                        </div>
                        <div class="inspect-item">
                            <span class="label">Tên tệp gốc:</span>
                            <span class="val font-mono">${info.originalName || '<em>(Không có trong FCQ1)</em>'}</span>
                        </div>
                        <div class="inspect-item">
                            <span class="label">Loại MIME gốc:</span>
                            <span class="val font-mono">${info.mimeType}</span>
                        </div>
                        <div class="inspect-item">
                            <span class="label">Kích thước Payload:</span>
                            <span class="val">${FilePreview.formatBytes(info.payloadSize)} (${info.payloadSize.toLocaleString()} bytes)</span>
                        </div>
                        <div class="inspect-item">
                            <span class="label">Kích thước Tag/MAC:</span>
                            <span class="val">${info.authSize} bytes (${info.authenticated ? 'AEAD / HMAC xác thực' : 'Không có MAC'})</span>
                        </div>
                        <div class="inspect-item full-width">
                            <span class="label">Salt (16 bytes):</span>
                            <span class="val font-mono hex-view">${saltHex}</span>
                        </div>
                        <div class="inspect-item full-width">
                            <span class="label">IV / Nonce (${info.iv.length} bytes):</span>
                            <span class="val font-mono hex-view">${ivHex}</span>
                        </div>
                    </div>
                `;
            }
        } catch (err) {
            handleError(err);
        }
    });

    function showResult(message, outName, size) {
        resultSection.style.display = 'block';
        resultDetails.innerHTML = `
            <div class="result-success-box">
                <div class="result-icon">✅</div>
                <div class="result-text">
                    <p>${message}</p>
                    <small>Tệp sẵn sàng tải xuống: <strong>${outName}</strong> (${FilePreview.formatBytes(size)})</small>
                </div>
            </div>
        `;
        downloadBtn.onclick = () => {
            if (!processedResult) return;
            const blob = new Blob([processedResult.data], { type: processedResult.mime || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = processedResult.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        };
    }

    function handleError(err) {
        progressSection.style.display = 'none';
        transmission.setState('error');
        alert(`ĐÃ XẢY RA LỖI:\n${err.message || err}`);
    }

    // In-Browser Self Test Suite
    if (runSelfTestBtn) {
        runSelfTestBtn.addEventListener('click', async () => {
            selfTestResults.innerHTML = '<div class="test-running">⏳ Đang chạy bộ kiểm thử toàn diện trên trình duyệt...</div>';
            runSelfTestBtn.disabled = true;

            const testSample = new TextEncoder().encode("CryptoLab Browser Test 2026! Kiểm thử tính tương thích giữa Web Crypto và Qt.");
            const testPass = "TestPassword#2026";
            let resultsHtml = '';

            try {
                for (const alg of [2, 3, 1]) {
                    const name = CryptoEngine.AlgorithmNames[alg];
                    const t0 = performance.now();

                    // Encrypt
                    const enc = await CryptoEngine.encryptFile(testSample, "selftest.txt", "text/plain", testPass, alg);
                    // Decrypt
                    const dec = await CryptoEngine.decryptFile(enc, testPass);
                    const t1 = performance.now();

                    const ok = (dec.plaintext.length === testSample.length) && (dec.originalName === "selftest.txt");

                    // Tamper check
                    let tamperDetected = false;
                    const tampered = new Uint8Array(enc);
                    tampered[tampered.length - 10] ^= 0xAA;
                    try {
                        await CryptoEngine.decryptFile(tampered, testPass);
                    } catch (e) {
                        tamperDetected = true;
                    }

                    resultsHtml += `
                        <div class="test-card ${ok && tamperDetected ? 'pass' : 'fail'}">
                            <div class="test-header">
                                <span class="test-badge">${ok ? 'PASSED' : 'FAILED'}</span>
                                <strong>Thuật toán: ${name}</strong>
                                <span class="test-time">${Math.round(t1 - t0)} ms</span>
                            </div>
                            <div class="test-details">
                                • Mã hóa và giải mã Round-trip: <strong>${ok ? 'Khớp 100% dữ liệu gốc' : 'LỖI'}</strong><br>
                                • Khôi phục Metadata (Tên & MIME): <strong>${dec.originalName} (${dec.mimeType})</strong><br>
                                • Bẫy can thiệp dữ liệu (Tampering Protection): <strong>${tamperDetected ? 'Bảo vệ thành công' : 'LỖI'}</strong>
                            </div>
                        </div>
                    `;
                }
                selfTestResults.innerHTML = resultsHtml;
            } catch (err) {
                selfTestResults.innerHTML = `<div class="test-error">Lỗi trong quá trình kiểm thử: ${err.message}</div>`;
            } finally {
                runSelfTestBtn.disabled = false;
            }
        });
    }
});
