/**
 * Component for handling API specification upload
 */

export class SpecUploadHandler {
    constructor() {
        this.selectedFile = null;
        this.onUpdateCallback = null;
        this.init();
    }

    /**
     * Initialize event listeners
     */
    init() {
        // Get DOM elements
        this.modal = document.getElementById('updateSpecModal');
        this.updateSpecBtn = document.getElementById('updateSpecBtn');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.cancelUploadBtn = document.getElementById('cancelUploadBtn');
        this.submitUploadBtn = document.getElementById('submitUploadBtn');
        this.fileUpload = document.getElementById('file-upload');
        this.fileName = document.getElementById('fileName');
        this.uploadStatus = document.getElementById('uploadStatus');

        // Check if all elements exist
        if (!this.modal || !this.updateSpecBtn || !this.fileUpload) {
            console.error('SpecUploadHandler: Required DOM elements not found');
            return;
        }

        // Open modal
        this.updateSpecBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.openModal();
        });

        // Close modal
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        }

        if (this.cancelUploadBtn) {
            this.cancelUploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        }

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // File selection
        this.fileUpload.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Drag and drop
        const dropZone = this.modal.querySelector('.border-dashed');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('border-gray-400', 'bg-gray-50');
            });

            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('border-gray-400', 'bg-gray-50');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('border-gray-400', 'bg-gray-50');

                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    this.handleFileSelect(e.dataTransfer.files[0]);
                }
            });
        }

        // Submit upload
        if (this.submitUploadBtn) {
            this.submitUploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }

        // Load current spec info initially
        this.loadCurrentSpecInfo();
    }

    /**
     * Open the modal
     */
    openModal() {
        this.modal.classList.remove('hidden');
        this.loadCurrentSpecInfo();
    }

    /**
     * Close the modal
     */
    closeModal() {
        this.modal.classList.add('hidden');
        this.resetForm();
    }

    /**
     * Reset the form
     */
    resetForm() {
        this.selectedFile = null;
        this.fileUpload.value = '';
        this.fileName.classList.add('hidden');
        this.fileName.textContent = '';
        this.submitUploadBtn.disabled = true;
        this.uploadStatus.classList.add('hidden');
    }

    /**
     * Handle file selection
     */
    handleFileSelect(file) {
        if (!file) {
            console.log('No file selected');
            return;
        }

        console.log('File selected:', file.name, file.type, file.size, 'bytes');

        // Validate file type
        const validTypes = ['application/json', 'text/plain', ''];
        const validExtensions = ['.json', '.yaml', '.yml'];
        const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

        if (!validTypes.includes(file.type) && !hasValidExtension) {
            this.showStatus('error', 'Please upload a JSON or YAML file');
            return;
        }

        this.selectedFile = file;

        if (this.fileName) {
            this.fileName.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
            this.fileName.classList.remove('hidden');
        }

        if (this.submitUploadBtn) {
            this.submitUploadBtn.disabled = false;
        }

        if (this.uploadStatus) {
            this.uploadStatus.classList.add('hidden');
        }
    }

    /**
     * Load current spec info
     */
    async loadCurrentSpecInfo() {
        try {
            const response = await fetch('/api/spec-info');
            const data = await response.json();

            document.getElementById('specName').textContent = data.name || 'Unknown';
            document.getElementById('specVersion').textContent = data.version || '-';
            document.getElementById('specEndpoints').textContent = data.endpointCount || '0';
        } catch (error) {
            console.error('Failed to load spec info:', error);
        }
    }

    /**
     * Handle form submission
     */
    async handleSubmit() {
        if (!this.selectedFile) {
            console.log('No file to submit');
            return;
        }

        console.log('Starting upload for:', this.selectedFile.name);

        if (this.submitUploadBtn) {
            this.submitUploadBtn.disabled = true;
            this.submitUploadBtn.textContent = 'Uploading...';
        }

        try {
            // Read file content
            console.log('Reading file content...');
            const content = await this.readFileContent(this.selectedFile);
            console.log('File content read, length:', content.length);

            // Detect spec type
            const specType = this.detectSpecType(content);
            console.log('Detected spec type:', specType);

            // Send to backend
            console.log('Sending to /api/update-spec...');
            const response = await fetch('/api/update-spec', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    specContent: content,
                    specType: specType,
                }),
            });

            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Response:', result);

            if (response.ok) {
                this.showStatus('success', 'API specification updated successfully! Reloading...');

                // Call callback if registered
                if (this.onUpdateCallback) {
                    this.onUpdateCallback(result.manifest);
                }

                // Reload the page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                const errorMsg = result.message || result.error || 'Failed to update specification';
                console.error('Upload failed:', errorMsg);
                this.showStatus('error', errorMsg);

                if (this.submitUploadBtn) {
                    this.submitUploadBtn.disabled = false;
                    this.submitUploadBtn.textContent = 'Update Specification';
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showStatus('error', `Error: ${error.message}`);

            if (this.submitUploadBtn) {
                this.submitUploadBtn.disabled = false;
                this.submitUploadBtn.textContent = 'Update Specification';
            }
        }
    }

    /**
     * Read file content
     */
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    // Try to parse as JSON
                    JSON.parse(content);
                    resolve(content);
                } catch (error) {
                    reject(new Error('File must be valid JSON'));
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Detect spec type
     */
    detectSpecType(content) {
        try {
            const parsed = JSON.parse(content);
            if (parsed.info?.schema?.includes('postman')) {
                return 'postman';
            }
            return 'openapi';
        } catch {
            return 'openapi';
        }
    }

    /**
     * Show status message
     */
    showStatus(type, message) {
        this.uploadStatus.classList.remove('hidden');
        this.uploadStatus.className = `p-3 rounded-md text-sm ${
            type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
        }`;
        this.uploadStatus.textContent = message;
    }

    /**
     * Register callback for when spec is updated
     */
    onUpdate(callback) {
        this.onUpdateCallback = callback;
    }
}
