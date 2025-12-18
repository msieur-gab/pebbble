/**
 * StoneCanvas - Animated pebble/stone visualization
 * Inspired by the tape player, shows a glowing stone that pulses with playback
 */

import { LitElement, html, css } from 'lit';
import { eventBus, Events } from '../services/EventBus.js';

class StoneCanvas extends LitElement {
    static styles = css`
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
    `;

    constructor() {
        super();
        this.canvas = null;
        this.ctx = null;
        this.animationFrame = null;

        this.state = {
            isPlaying: false,
            progress: 0,
            glowIntensity: 0.3
        };

        this.unsubscribers = [];
        this.handleResize = this.resize.bind(this);
        this.handleVisibilityChange = this.onVisibilityChange.bind(this);
        this.isSheetExpanded = false;
    }

    connectedCallback() {
        super.connectedCallback();
        this.updateComplete.then(() => {
            this.setupCanvas();
            this.startAnimation();
        });
        this.setupEventListeners();
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
        this.stopAnimation();
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }

    onVisibilityChange() {
        if (document.hidden || this.isSheetExpanded) {
            this.stopAnimation();
        } else {
            this.startAnimation();
        }
    }

    setupCanvas() {
        this.canvas = this.shadowRoot.getElementById('stone-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', this.handleResize);
    }

    resize() {
        const container = this.shadowRoot.querySelector('.canvas-container');
        if (!container || !this.canvas) return;

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

        // Pause when player sheet expands (we're behind the overlay)
        this.unsubscribers.push(
            eventBus.on(Events.PLAYER_SHEET_EXPAND, () => {
                this.isSheetExpanded = true;
                this.stopAnimation();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.PLAYER_SHEET_COLLAPSE, () => {
                this.isSheetExpanded = false;
                if (!document.hidden) {
                    this.startAnimation();
                }
            })
        );
    }

    startAnimation() {
        if (this.animationFrame) return; // Already running
        const animate = () => {
            this.draw();
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    draw() {
        if (!this.canvas || !this.ctx) return;

        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        this.ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) * 0.35;

        if (this.state.isPlaying) {
            this.state.glowIntensity = 0.4 + Math.sin(Date.now() / 500) * 0.15;
        } else {
            this.state.glowIntensity = 0.25;
        }

        this.drawGlowRings(centerX, centerY, baseRadius);
        this.drawStone(centerX, centerY, baseRadius);

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
        const time = Date.now() / 3000;
        const wobble = this.state.isPlaying ? 3 : 1;

        this.ctx.save();
        this.ctx.translate(x, y);

        const floatY = Math.sin(time * 2) * wobble;
        const floatRotation = Math.sin(time) * 0.02 * wobble;
        this.ctx.translate(0, floatY);
        this.ctx.rotate(floatRotation);

        const gradient = this.ctx.createRadialGradient(
            -radius * 0.3, -radius * 0.3, 0,
            0, 0, radius
        );
        gradient.addColorStop(0, '#ff6a2a');
        gradient.addColorStop(0.4, '#FF4D00');
        gradient.addColorStop(0.7, '#cc3d00');
        gradient.addColorStop(1, '#802600');

        this.ctx.beginPath();
        this.drawOrganicShape(0, 0, radius);
        this.ctx.fillStyle = gradient;

        this.ctx.shadowColor = `rgba(255, 77, 0, ${this.state.glowIntensity})`;
        this.ctx.shadowBlur = 30 + (this.state.isPlaying ? 20 : 0);
        this.ctx.fill();

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

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, startAngle, endAngle);
        this.ctx.strokeStyle = '#FF4D00';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
    }

    render() {
        return html`
            <div class="canvas-container">
                <canvas id="stone-canvas"></canvas>
            </div>
        `;
    }
}

customElements.define('stone-canvas', StoneCanvas);

export default StoneCanvas;
