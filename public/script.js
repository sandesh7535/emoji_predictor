const textInput = document.getElementById('textInput');
const predictBtn = document.getElementById('predictBtn');
const errorMsg = document.getElementById('errorMsg');
const emojiResult = document.getElementById('emojiResult');
const loading = document.getElementById('loading');

predictBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    
    // Clear previous state
    errorMsg.textContent = '';
    emojiResult.textContent = '';
    
    // Validate empty input
    if (!text) {
        errorMsg.textContent = 'Please enter some text before predicting.';
        return;
    }
    
    // Show loading state
    predictBtn.disabled = true;
    loading.classList.remove('hidden');
    emojiResult.classList.add('hidden');

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
        
        const data = await response.json();
        
        // Handle backend errors
        if (!response.ok) {
            throw new Error(data.error || 'Failed to predict emoji');
        }
        
        // Ensure a small artificial delay to display the loading animation smoothly
        setTimeout(() => {
            emojiResult.textContent = data.emoji;
            loading.classList.add('hidden');
            emojiResult.classList.remove('hidden');
            
            // Re-trigger the CSS animation
            emojiResult.style.animation = 'none';
            emojiResult.offsetHeight; /* trigger reflow */
            emojiResult.style.animation = null; 
            
            predictBtn.disabled = false;
        }, 600); // 600ms delay

    } catch (error) {
        loading.classList.add('hidden');
        errorMsg.textContent = error.message;
        predictBtn.disabled = false;
    }
});

const suggestBtn = document.getElementById('suggestBtn');

suggestBtn.addEventListener('click', async () => {
    const originalText = suggestBtn.textContent;
    suggestBtn.textContent = 'Thinking...';
    suggestBtn.disabled = true;
    errorMsg.textContent = '';
    
    try {
        const response = await fetch('/suggest');
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to suggest text');
        }
        
        textInput.value = data.suggestion;
    } catch(err) {
        errorMsg.textContent = err.message;
    } finally {
        suggestBtn.textContent = originalText;
        suggestBtn.disabled = false;
    }
});
