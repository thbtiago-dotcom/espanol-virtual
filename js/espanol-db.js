/* ========================================
   ESPAÑOL DB - Local Storage Manager
======================================== */

const EspanolDB = {
    
    KEYS: {
        PROGRESS: 'espanol-virtual-progress',
        SETTINGS: 'espanol-virtual-settings',
        CACHE: 'espanol-virtual-cache'
    },
    
    // Save data
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },
    
    // Load data
    load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return defaultValue;
        }
    },
    
    // Remove data
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },
    
    // Clear all app data
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            this.remove(key);
        });
    },
    
    // Get storage size
    getStorageSize() {
        let total = 0;
        for (const key of Object.values(this.KEYS)) {
            const item = localStorage.getItem(key);
            if (item) {
                total += item.length * 2; // UTF-16 characters
            }
        }
        return total;
    },
    
    // Export all data
    exportAll() {
        const data = {};
        for (const [name, key] of Object.entries(this.KEYS)) {
            data[name] = this.load(key);
        }
        data.exportedAt = new Date().toISOString();
        return data;
    },
    
    // Import all data
    importAll(data) {
        for (const [name, key] of Object.entries(this.KEYS)) {
            if (data[name]) {
                this.save(key, data[name]);
            }
        }
    }
};
