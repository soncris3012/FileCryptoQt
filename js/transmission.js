/**
 * FileCrypto Web — TransmissionWidget
 * Mô phỏng trực quan hóa luồng mã hóa / giải mã và truyền tải dữ liệu
 * Tái hiện tương đương widget Transmission trên Qt desktop
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.TransmissionWidget = factory();
}(typeof self !== 'undefined' ? self : this, function () {

    class TransmissionSimulator {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.state = 'idle'; // idle, encrypting, decrypting, completed, error
            this.progress = 0;
            this.algorithmName = 'AES-256-GCM';
            this.fileName = '';
            this.fileSize = 0;
            this.particles = [];
            this.animId = null;

            this.resize();
            window.addEventListener('resize', () => this.resize());
            this.startLoop();
        }

        resize() {
            if (!this.canvas) return;
            const rect = this.canvas.getBoundingClientRect();
            this.width = rect.width;
            this.height = 140;
            this.canvas.width = this.width * window.devicePixelRatio;
            this.canvas.height = this.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }

        setState(state, progress = 0, meta = {}) {
            this.state = state;
            this.progress = Math.min(1, Math.max(0, progress));
            if (meta.algorithm) this.algorithmName = meta.algorithm;
            if (meta.fileName) this.fileName = meta.fileName;
            if (meta.fileSize) this.fileSize = meta.fileSize;

            if (this.state === 'encrypting' || this.state === 'decrypting') {
                for (let i = 0; i < 3; i++) {
                    this.spawnParticle();
                }
            }
        }

        spawnParticle() {
            if (this.particles.length > 60) return;
            const isEnc = this.state === 'encrypting';
            this.particles.push({
                x: isEnc ? 80 : this.width - 80,
                y: this.height / 2 + (Math.random() - 0.5) * 20,
                targetX: isEnc ? this.width - 80 : 80,
                speed: 2 + Math.random() * 3,
                size: 2 + Math.random() * 3,
                color: isEnc ? (Math.random() > 0.5 ? '#00f2fe' : '#4facfe') : (Math.random() > 0.5 ? '#10b981' : '#34d399'),
                alpha: 1.0,
                char: Math.random() > 0.5 ? '1' : '0'
            });
        }

        startLoop() {
            const render = () => {
                this.draw();
                this.animId = requestAnimationFrame(render);
            };
            this.animId = requestAnimationFrame(render);
        }

        draw() {
            if (!this.ctx) return;
            const ctx = this.ctx;
            const w = this.width;
            const h = this.height;

            ctx.clearRect(0, 0, w, h);

            const centerY = h / 2;
            const leftX = 80;
            const midX = w / 2;
            const rightX = w - 80;

            // 1. Draw transmission pipe / line
            ctx.beginPath();
            ctx.moveTo(leftX, centerY);
            ctx.lineTo(rightX, centerY);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Active progress pipe
            if (this.state === 'encrypting' || this.state === 'decrypting' || this.state === 'completed') {
                ctx.beginPath();
                ctx.moveTo(leftX, centerY);
                const currentX = leftX + (rightX - leftX) * (this.state === 'completed' ? 1 : this.progress);
                ctx.lineTo(currentX, centerY);
                const grad = ctx.createLinearGradient(leftX, centerY, rightX, centerY);
                grad.addColorStop(0, '#00f2fe');
                grad.addColorStop(0.5, '#8a2be2');
                grad.addColorStop(1, '#10b981');
                ctx.strokeStyle = grad;
                ctx.lineWidth = 4;
                ctx.shadowColor = '#00f2fe';
                ctx.shadowBlur = 10;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // 2. Update and draw particles
            if (this.state === 'encrypting' || this.state === 'decrypting') {
                if (Math.random() < 0.6) this.spawnParticle();
            }

            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                if (this.state === 'encrypting') {
                    p.x += p.speed;
                    if (p.x >= p.targetX) {
                        this.particles.splice(i, 1);
                        continue;
                    }
                } else if (this.state === 'decrypting') {
                    p.x -= p.speed;
                    if (p.x <= p.targetX) {
                        this.particles.splice(i, 1);
                        continue;
                    }
                } else {
                    p.alpha -= 0.05;
                    if (p.alpha <= 0) {
                        this.particles.splice(i, 1);
                        continue;
                    }
                }

                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 6;
                ctx.font = '10px monospace';
                ctx.fillText(p.char, p.x, p.y);
                ctx.restore();
            }

            // 3. Draw Left Node (Source)
            this.drawNode(leftX, centerY, this.state === 'encrypting' ? 'Nguồn (Plain)' : 'Khôi phục', '#4facfe', '📄');

            // 4. Draw Center Node (Engine)
            this.drawNode(midX, centerY, this.algorithmName, '#8a2be2', '⚡', true);

            // 5. Draw Right Node (Output / Ciphertext)
            this.drawNode(rightX, centerY, this.state === 'encrypting' ? 'Bản mã (FCQ2)' : 'Tệp .FCQ', '#10b981', '🔒');
        }

        drawNode(x, y, label, color, icon, isCenter = false) {
            const ctx = this.ctx;
            const radius = isCenter ? 26 : 22;

            // Outer glow
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(18, 24, 38, 0.9)';
            ctx.strokeStyle = color;
            ctx.lineWidth = isCenter ? 3 : 2;
            if (this.state === 'encrypting' || this.state === 'decrypting') {
                ctx.shadowColor = color;
                ctx.shadowBlur = 12;
            }
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Icon
            ctx.save();
            ctx.font = isCenter ? '18px sans-serif' : '15px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, x, y);
            ctx.restore();

            // Label
            ctx.save();
            ctx.font = '11px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fillText(label, x, y + radius + 15);
            ctx.restore();
        }
    }

    return {
        create: (canvasId) => new TransmissionSimulator(canvasId)
    };
}));
