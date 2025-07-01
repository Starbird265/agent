// Supabase Configuration
const SUPABASE_URL = 'https://haiqtrxaxxvdwfccywrz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaXF0cnhheHh2ZHdmY2N5d3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDE1MzAsImV4cCI6MjA2NjkxNzUzMH0.h4Ke73y5LXCu3W0mxB1F_vhySN4dlyi3B-P7poHoOZA';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Download URLs - UPDATE THESE AFTER CREATING GITHUB RELEASE
const DOWNLOAD_URLS = {
    macos: 'https://github.com/Starbird265/agent/releases/latest/download/Nitrix-mac.dmg',
    windows: 'https://github.com/Starbird265/agent/releases/latest/download/Nitrix-win.exe',
    linux: 'https://github.com/Starbird265/agent/releases/latest/download/Nitrix-linux.AppImage'
};

// DOM Elements
const inviteSection = document.getElementById('inviteSection');
const downloadSection = document.getElementById('downloadSection');
const inviteCodeInput = document.getElementById('inviteCode');
const validateBtn = document.getElementById('validateBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');

// Event Listeners
validateBtn.addEventListener('click', validateInviteCode);
inviteCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') validateInviteCode();
});

// Auto-format invite code as user types
inviteCodeInput.addEventListener('input', (e) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length > 12) value = value.slice(0, 12);
    
    // Format as XXXX-XXXX-XXXX
    if (value.length > 4) {
        value = value.slice(0, 4) + '-' + value.slice(4);
    }
    if (value.length > 9) {
        value = value.slice(0, 9) + '-' + value.slice(9);
    }
    
    e.target.value = value;
});

// Validate invite code with Supabase
async function validateInviteCode() {
    const code = inviteCodeInput.value.replace(/-/g, '');
    
    if (!code || code.length !== 12) {
        showError('Please enter a valid 12-character invite code');
        return;
    }

    showLoading(true);
    hideError();

    try {
        // Check if code exists and is unused
        const { data, error } = await supabase
            .from('invite_codes')
            .select('*')
            .eq('code', code)
            .eq('used', false)
            .single();

        if (error || !data) {
            showError('Invalid or expired invite code');
            showLoading(false);
            return;
        }

        // Mark code as used
        const { error: updateError } = await supabase
            .from('invite_codes')
            .update({ 
                used: true, 
                used_at: new Date().toISOString(),
                used_by_ip: await getUserIP()
            })
            .eq('code', code);

        if (updateError) {
            console.error('Failed to mark code as used:', updateError);
        }

        // Show success and download options
        showDownloadSection();
        
    } catch (err) {
        console.error('Validation error:', err);
        showError('Something went wrong. Please try again.');
    }

    showLoading(false);
}

// Get user IP for tracking
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'unknown';
    }
}

// Show loading state
function showLoading(show) {
    loadingSpinner.classList.toggle('hidden', !show);
    validateBtn.disabled = show;
    validateBtn.innerHTML = show ? 
        '<i class="fas fa-spinner fa-spin mr-2"></i>Validating...' : 
        '<i class="fas fa-rocket mr-2"></i>Access Nitrix';
}

// Show error message
function showError(message) {
    errorMessage.querySelector('span').textContent = message;
    errorMessage.classList.remove('hidden');
}

// Hide error message
function hideError() {
    errorMessage.classList.add('hidden');
}

// Show download section
function showDownloadSection() {
    inviteSection.style.transform = 'translateY(-20px)';
    inviteSection.style.opacity = '0.5';
    
    setTimeout(() => {
        inviteSection.classList.add('hidden');
        downloadSection.classList.remove('hidden');
        downloadSection.style.opacity = '0';
        downloadSection.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            downloadSection.style.opacity = '1';
            downloadSection.style.transform = 'translateY(0)';
        }, 100);
    }, 300);
}

// Handle download clicks
document.addEventListener('click', (e) => {
    const downloadCard = e.target.closest('.download-card');
    if (!downloadCard) return;
    
    const platform = downloadCard.dataset.platform;
    const downloadUrl = DOWNLOAD_URLS[platform];
    
    if (downloadUrl) {
        // Track download
        trackDownload(platform);
        
        // Start download
        window.open(downloadUrl, '_blank');
        
        // Show download instructions
        showDownloadInstructions(platform);
    }
});

// Track download analytics
async function trackDownload(platform) {
    try {
        await supabase
            .from('download_analytics')
            .insert({
                platform: platform,
                downloaded_at: new Date().toISOString(),
                user_ip: await getUserIP(),
                user_agent: navigator.userAgent
            });
    } catch (err) {
        console.error('Failed to track download:', err);
    }
}

// Show platform-specific instructions
function showDownloadInstructions(platform) {
    const instructions = {
        macos: 'Open the downloaded .dmg file and drag Nitrix to your Applications folder.',
        windows: 'Run the downloaded .exe file and follow the installation wizard.',
        linux: 'Make the .AppImage file executable (chmod +x) and run it directly.'
    };
    
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg max-w-md z-50';
    toast.innerHTML = `
        <div class="flex items-start">
            <i class="fas fa-check-circle text-xl mr-3 mt-1"></i>
            <div>
                <h4 class="font-bold mb-1">Download Started!</h4>
                <p class="text-sm">${instructions[platform]}</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Demo mode for testing (remove in production)
if (window.location.hash === '#demo') {
    // Skip validation in demo mode
    validateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showDownloadSection();
    });
}