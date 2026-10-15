/**
 * FileCrypto Web — FilePreview Engine
 * Hỗ trợ hiển thị Text (có số dòng), Ảnh, Video/Audio và Bảng HEX nhị phân chuẩn 16 cột
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.FilePreview = factory();
}(typeof self !== 'undefined' ? self : this, function () {

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function generateHexDump(data, maxBytes = 8192) {
        const len = Math.min(data.length, maxBytes);
        let out = '';
        for (let i = 0; i < len; i += 16) {
            // Offset
            const offset = i.toString(16).padStart(8, '0').toUpperCase();
            let hexPart = '';
            let asciiPart = '';

            for (let j = 0; j < 16; j++) {
                if (i + j < len) {
                    const byte = data[i + j];
                    hexPart += byte.toString(16).padStart(2, '0').toUpperCase() + ' ';
                    if (j === 7) hexPart += ' '; // space separator
                    // ASCII
                    if (byte >= 32 && byte <= 126) {
                        asciiPart += String.fromCharCode(byte);
                    } else {
                        asciiPart += '.';
                    }
                } else {
                    hexPart += '   ';
                    if (j === 7) hexPart += ' ';
                }
            }
            out += `${offset}  ${hexPart} |${asciiPart}|\n`;
        }
        if (data.length > maxBytes) {
            out += `\n... [Đã cắt ngắn ${formatBytes(maxBytes)} / ${formatBytes(data.length)} để tối ưu giao diện] ...`;
        }
        return out;
    }

    function render(container, data, fileName, mimeType) {
        if (!container) return;
        container.innerHTML = '';

        if (!data || data.length === 0) {
            container.innerHTML = `<div class="preview-empty">Không có dữ liệu để xem trước</div>`;
            return;
        }

        mimeType = (mimeType || '').toLowerCase();
        const ext = (fileName || '').split('.').pop().toLowerCase();

        // 1. Image Preview
        if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
            const blob = new Blob([data], { type: mimeType || 'image/png' });
            const url = URL.createObjectURL(blob);
            const wrapper = document.createElement('div');
            wrapper.className = 'preview-image-wrapper';
            wrapper.innerHTML = `
                <div class="preview-meta-badge">📷 Hình ảnh (${formatBytes(data.length)})</div>
                <img src="${url}" alt="Preview" class="preview-image" onload="URL.revokeObjectURL('${url}')" />
            `;
            container.appendChild(wrapper);
            return;
        }

        // 2. Video Preview
        if (mimeType.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) {
            const blob = new Blob([data], { type: mimeType || 'video/mp4' });
            const url = URL.createObjectURL(blob);
            const wrapper = document.createElement('div');
            wrapper.className = 'preview-media-wrapper';
            wrapper.innerHTML = `
                <div class="preview-meta-badge">🎬 Video (${formatBytes(data.length)})</div>
                <video controls class="preview-video" src="${url}"></video>
            `;
            container.appendChild(wrapper);
            return;
        }

        // 3. Audio Preview
        if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
            const blob = new Blob([data], { type: mimeType || 'audio/mp3' });
            const url = URL.createObjectURL(blob);
            const wrapper = document.createElement('div');
            wrapper.className = 'preview-media-wrapper';
            wrapper.innerHTML = `
                <div class="preview-meta-badge">🎵 Âm thanh (${formatBytes(data.length)})</div>
                <audio controls class="preview-audio" src="${url}"></audio>
            `;
            container.appendChild(wrapper);
            return;
        }

        // 4. Text Preview (if text mime, code ext, or mostly printable ascii/utf8)
        const isTextCandidate = mimeType.startsWith('text/') ||
            ['txt', 'json', 'xml', 'html', 'css', 'js', 'ts', 'md', 'py', 'c', 'cpp', 'h', 'swift', 'yaml', 'yml', 'sh', 'csv', 'log', 'ini'].includes(ext);

        let isText = isTextCandidate;
        let textContent = '';

        if (!isText && data.length < 500000) {
            // Check first 1024 bytes for non-printable chars
            let printable = 0;
            const checkLen = Math.min(data.length, 1024);
            for (let i = 0; i < checkLen; i++) {
                const b = data[i];
                if ((b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13) printable++;
            }
            if (printable / checkLen > 0.85) {
                isText = true;
            }
        }

        if (isText) {
            try {
                textContent = new TextDecoder('utf-8', { fatal: true }).decode(data.subarray(0, 100000));
                const wrapper = document.createElement('div');
                wrapper.className = 'preview-text-wrapper';

                const lines = textContent.split('\n');
                const lineNumbers = lines.map((_, i) => i + 1).join('\n');

                wrapper.innerHTML = `
                    <div class="preview-meta-badge">📄 Văn bản (${lines.length} dòng, ${formatBytes(data.length)})</div>
                    <div class="code-container">
                        <pre class="line-numbers">${lineNumbers}</pre>
                        <pre class="code-content"><code>${escapeHtml(textContent)}</code></pre>
                    </div>
                `;
                container.appendChild(wrapper);
                return;
            } catch (e) {
                // Not valid UTF-8, fall through to HEX
            }
        }

        // 5. Binary / Hex View
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-hex-wrapper';
        wrapper.innerHTML = `
            <div class="preview-meta-badge">🔢 Dữ liệu nhị phân / HEX Dump (${formatBytes(data.length)})</div>
            <pre class="hex-dump"><code>${escapeHtml(generateHexDump(data))}</code></pre>
        `;
        container.appendChild(wrapper);
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    return {
        render,
        generateHexDump,
        formatBytes
    };
}));
