const tg = window.Telegram.WebApp;

// Initialize Telegram WebApp
tg.ready();
tg.MainButton.text = "Share in Chat";
tg.MainButton.show();

// Form elements
const eventForm = document.getElementById('eventForm');
const eventTitle = document.getElementById('eventTitle');
const optionsList = document.getElementById('optionsList');
const addOptionBtn = document.getElementById('addOption');

// Add option functionality
addOptionBtn.addEventListener('click', () => {
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option-input';
    optionDiv.innerHTML = `
        <input type="text" class="option" placeholder="e.g., Sunday 6 PM" required>
        <button type="button" class="remove-option">×</button>
    `;
    
    optionsList.appendChild(optionDiv);
    updateRemoveButtons();
});

// Remove option functionality
function updateRemoveButtons() {
    const removeButtons = document.querySelectorAll('.remove-option');
    const optionInputs = document.querySelectorAll('.option-input');
    
    removeButtons.forEach((btn, index) => {
        btn.style.display = optionInputs.length > 2 ? 'flex' : 'none';
        
        btn.onclick = () => {
            if (optionInputs.length > 2) {
                btn.parentElement.remove();
                updateRemoveButtons();
            }
        };
    });
}

// Form validation
function validateForm() {
    const title = eventTitle.value.trim();
    const options = Array.from(document.querySelectorAll('.option')).map(input => input.value.trim());
    
    if (!title) {
        tg.showAlert('Please enter an event title');
        return false;
    }
    
    if (options.length < 2) {
        tg.showAlert('Please add at least 2 options');
        return false;
    }
    
    if (options.some(option => !option)) {
        tg.showAlert('Please fill all option fields');
        return false;
    }
    
    return { title, options };
}

// Handle form submission
tg.MainButton.onClick(() => {
    const formData = validateForm();
    if (formData) {
        // Create poll message
        const pollMessage = `🎯 **${formData.title}**\n\nPlease vote for your preferred option:\n\n${formData.options.map((opt, i) => `${i+1}. ${opt}`).join('\n')}`;
        
        tg.answerWebAppQuery(tg.initDataUnsafe.query_id, {
            type: 'article',
            id: '1',
            title: `Event: ${formData.title}`,
            description: `Created event with ${formData.options.length} options`,
            message_text: pollMessage,
            parse_mode: 'Markdown'
        });
    }
});

// Initialize remove buttons
updateRemoveButtons();

// Auto-resize
function adjustHeight() {
    const height = document.body.scrollHeight;
    tg.expand();
}

window.addEventListener('load', adjustHeight);
window.addEventListener('resize', adjustHeight);
