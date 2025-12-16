// components/card.js

class CardComponent extends HTMLElement {
    static get observedAttributes() {
        return ['title', 'description', 'data-id'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    render() {
        const title = this.getAttribute('title') || '';
        const description = this.getAttribute('description') || '';
        this.shadowRoot.innerHTML = `
            <style>
                .card {
                    background-color: #eef2ff;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                    min-width: 150px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }
            </style>
            <div class="card">
                <h4>${title}</h4>
                <p>${description}</p>
            </div>
        `;
    }
}

customElements.define('card-component', CardComponent);