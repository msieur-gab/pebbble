/**
 * StoneCanvas - Animated pebble/stone visualization
 * Inspired by the tape player, shows a glowing stone that pulses with playback
 */

import { eventBus, Events } from '../services/EventBus.js';

class StoneCanvas extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.canvas = null;
        this.ctx = null;
        this.animationFrame = null;

        this.state = {
            isPlaying: false,
            progress: 0, // 0 to 1
            glowIntensity: 0.3
        };

        this.unsubscribers = [];
    }

    connectedCallback() {
        this.render();
        this.setupCanvas();
        this.setupEventListeners();
        this.startAnimation();
    }

    disconnectedCallback() {
        this.unsubscribers.forEach(unsub => unsub());
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    setupCanvas() {
        this.canvas = this.shadowRoot.getElementById('stone-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const container = this.shadowRoot.querySelector('.canvas-container');
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        this.ctx.scale(dpr, dpr);
    }

    setupEventListeners() {
        this.unsubscribers.push(
            eventBus.on(Events.PLAY, () => {
                this.state.isPlaying = true;
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.PAUSE, () => {
                this.state.isPlaying = false;
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.TIME_UPDATE, (data) => {
                this.state.progress = data.percent / 100;
            })
        );
    }

    startAnimation() {
        const animate = () => {
            this.draw();
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    draw() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        this.ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) * 0.35;

        // Animate glow intensity based on playback
        if (this.state.isPlaying) {
            this.state.glowIntensity = 0.4 + Math.sin(Date.now() / 500) * 0.15;
        } else {
            this.state.glowIntensity = 0.25;
        }

        // Draw glow rings
        this.drawGlowRings(centerX, centerY, baseRadius);

        // Draw stone
        this.drawStone(centerX, centerY, baseRadius);

        // Draw progress ring
        if (this.state.progress > 0) {
            this.drawProgressRing(centerX, centerY, baseRadius + 15);
        }
    }

    drawGlowRings(x, y, radius) {
        const rings = 3;
        const maxRadius = radius * 1.8;

        for (let i = 0; i < rings; i++) {
            const progress = ((Date.now() / 2000) + (i * 0.33)) % 1;
            const ringRadius = radius + (maxRadius - radius) * progress;
            const alpha = (1 - progress) * this.state.glowIntensity * (this.state.isPlaying ? 1 : 0.5);

            this.ctx.beginPath();
            this.ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(255, 77, 0, ${alpha})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    drawStone(x, y, radius) {
        // Organic stone shape using bezier curves
        const time = Date.now() / 3000;
        const wobble = this.state.isPlaying ? 3 : 1;

        this.ctx.save();
        this.ctx.translate(x, y);

        // Slight floating animation
        const floatY = Math.sin(time * 2) * wobble;
        const floatRotation = Math.sin(time) * 0.02 * wobble;
        this.ctx.translate(0, floatY);
        this.ctx.rotate(floatRotation);

        // Create gradient
        const gradient = this.ctx.createRadialGradient(
            -radius * 0.3, -radius * 0.3, 0,
            0, 0, radius
        );
        gradient.addColorStop(0, '#ff6a2a');
        gradient.addColorStop(0.4, '#FF4D00');
        gradient.addColorStop(0.7, '#cc3d00');
        gradient.addColorStop(1, '#802600');

        // Draw organic stone shape
        this.ctx.beginPath();
        this.drawOrganicShape(0, 0, radius);
        this.ctx.fillStyle = gradient;

        // Glow shadow
        this.ctx.shadowColor = `rgba(255, 77, 0, ${this.state.glowIntensity})`;
        this.ctx.shadowBlur = 30 + (this.state.isPlaying ? 20 : 0);
        this.ctx.fill();

        // Inner highlight
        const highlightGradient = this.ctx.createRadialGradient(
            -radius * 0.4, -radius * 0.4, 0,
            -radius * 0.2, -radius * 0.2, radius * 0.5
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = highlightGradient;
        this.ctx.fill();

        this.ctx.restore();
    }

    drawOrganicShape(x, y, radius) {
        // Create an organic, stone-like shape
        const points = 8;
        const variance = 0.15;

        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const r = radius * (1 + Math.sin(angle * 3) * variance + Math.cos(angle * 2) * variance * 0.5);
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;

            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                // Use quadratic curves for smoother shape
                const prevAngle = ((i - 0.5) / points) * Math.PI * 2;
                const cpR = radius * (1 + Math.sin(prevAngle * 3) * variance);
                const cpX = x + Math.cos(prevAngle) * cpR;
                const cpY = y + Math.sin(prevAngle) * cpR;
                this.ctx.quadraticCurveTo(cpX, cpY, px, py);
            }
        }

        this.ctx.closePath();
    }

    drawProgressRing(x, y, radius) {
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (Math.PI * 2 * this.state.progress);

        // Background ring
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Progress ring
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, startAngle, endAngle);
        this.ctx.strokeStyle = '#FF4D00';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin: 1rem 0;
                }

                .canvas-container {
                    width: 100%;
                    aspect-ratio: 1;
                    max-width: 250px;
                    max-height: 250px;
                    margin: 0 auto;
                }

                canvas {
                    display: block;
                }
            </style>

            <div class="canvas-container">
                <canvas id="stone-canvas"></canvas>
            </div>
        `;
    }
}

customElements.define('stone-canvas', StoneCanvas);

export default StoneCanvas;
