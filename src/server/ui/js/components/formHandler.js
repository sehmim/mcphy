/**
 * Component for handling the query input form
 */

export class FormHandler {
    constructor(formElement, inputElement, submitButton) {
        this.form = formElement;
        this.input = inputElement;
        this.submitButton = submitButton;
        this.sendText = this.submitButton.querySelector('#sendText');
        this.loadingText = this.submitButton.querySelector('#loadingText');
        this.onSubmitCallback = null;
    }

    /**
     * Initialize event listeners
     */
    init() {
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for the form
     */
    setupEventListeners() {
        // Handle form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Auto-resize textarea
        this.input.addEventListener('input', () => {
            this.input.style.height = 'auto';
            this.input.style.height = this.input.scrollHeight + 'px';
        });

        // Handle Enter key (submit) and Shift+Enter (new line)
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSubmit();
            }
        });
    }

    /**
     * Handle form submission
     */
    handleSubmit() {
        const query = this.getValue();
        if (!query) return;

        if (this.onSubmitCallback) {
            this.onSubmitCallback(query);
        }
    }

    /**
     * Register a callback for form submission
     * @param {Function} callback - The callback function to call on submit
     */
    onSubmit(callback) {
        this.onSubmitCallback = callback;
    }

    /**
     * Get the current input value
     * @returns {string} The trimmed input value
     */
    getValue() {
        return this.input.value.trim();
    }

    /**
     * Clear the input field
     */
    clear() {
        this.input.value = '';
        this.input.style.height = 'auto';
    }

    /**
     * Set the loading state
     * @param {boolean} loading - Whether the form is in loading state
     */
    setLoading(loading) {
        this.submitButton.disabled = loading;
        this.input.disabled = loading;

        if (this.sendText && this.loadingText) {
            this.sendText.classList.toggle('hidden', loading);
            this.loadingText.classList.toggle('hidden', !loading);
        }
    }

    /**
     * Focus the input field
     */
    focus() {
        this.input.focus();
    }

    /**
     * Set the input value
     * @param {string} value - The value to set
     */
    setValue(value) {
        this.input.value = value;
    }

    /**
     * Disable the form
     */
    disable() {
        this.input.disabled = true;
        this.submitButton.disabled = true;
    }

    /**
     * Enable the form
     */
    enable() {
        this.input.disabled = false;
        this.submitButton.disabled = false;
    }
}
