/* ========================================
   SYNC MANAGER - Backup & Restore
======================================== */

const SyncManager = {
    
    // Export progress to JSON file
    exportToFile() {
        const data = {
            progress: EspanolDB.load(EspanolDB.KEYS.PROGRESS),
            settings: EspanolDB.load(EspanolDB.KEYS.SETTINGS),
            exportedAt: new Date().toISOString(),
            version: '2.0',
            app: 'Español Virtual'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `espanol-virtual-backup-${this.getDateString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return true;
    },
    
    // Import progress from JSON file
    async importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Validate data
                    if (!data.progress && !data.aulaNumero) {
                        throw new Error('Invalid backup file format');
                    }
                    
                    // Handle both old and new format
                    if (data.progress) {
                        EspanolDB.save(EspanolDB.KEYS.PROGRESS, data.progress);
                    } else {
                        // Old format
                        EspanolDB.save(EspanolDB.KEYS.PROGRESS, {
                            aulaNumero: data.aulaNumero,
                            grades: data.grades || [],
                            savedAt: new Date().toISOString()
                        });
                    }
                    
                    if (data.settings) {
                        EspanolDB.save(EspanolDB.KEYS.SETTINGS, data.settings);
                    }
                    
                    resolve({
                        success: true,
                        message: 'Backup importado com sucesso!'
                    });
                } catch (error) {
                    reject({
                        success: false,
                        message: 'Erro ao importar arquivo: ' + error.message
                    });
                }
            };
            
            reader.onerror = () => {
                reject({
                    success: false,
                    message: 'Erro ao ler o arquivo'
                });
            };
            
            reader.readAsText(file);
        });
    },
    
    // Get formatted date string
    getDateString() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    },
    
    // Check if backup is needed (e.g., after X lessons)
    shouldBackup() {
        const progress = EspanolDB.load(EspanolDB.KEYS.PROGRESS);
        if (!progress || !progress.grades) return false;
        
        const lastBackup = EspanolDB.load('lastBackupGradeCount', 0);
        const currentCount = progress.grades.length;
        
        // Suggest backup every 10 grades
        return currentCount - lastBackup >= 10;
    },
    
    // Mark backup as done
    markBackupDone() {
        const progress = EspanolDB.load(EspanolDB.KEYS.PROGRESS);
        if (progress && progress.grades) {
            EspanolDB.save('lastBackupGradeCount', progress.grades.length);
        }
    }
};
