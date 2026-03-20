// Check backend connection on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔍 Checking backend connection...');
    
    try {
        const response = await fetch('/api/health', {
            mode: 'cors'
        });
        const data = await response.json();
        console.log('✅ Backend is connected:', data);
        
        document.getElementById('debugStatus').innerHTML = '✅ Backend connected';
        document.getElementById('debugInfo').style.display = 'block';
    } catch (error) {
        console.error('❌ Cannot connect to backend:', error);
        
        document.getElementById('debugStatus').innerHTML = `
            ❌ Cannot connect to backend<br>
            Retrying connection...
        `;
        document.getElementById('debugInfo').style.display = 'block';
    }
});

// Form submission handler
document.getElementById('registrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('📝 Form submitted');

    // Get form values
    const name = document.getElementById('name').value.trim();
    const paymentMethod = document.getElementById('paymentMethod').value;
    const paymentNumber = document.getElementById('paymentNumber').value.trim();

    console.log('Form data:', { name, paymentMethod, paymentNumber });

    // Validate inputs
    if (!name || !paymentMethod || !paymentNumber) {
        showError('Please fill in all fields');
        return;
    }

    if (paymentNumber.length !== 11 || !/^\d{11}$/.test(paymentNumber)) {
        showError('Payment number must be exactly 11 digits');
        return;
    }

    // Hide previous messages
    hideMessages();

    // Disable submit button
    const submitBtn = document.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';

    try {
        console.log('🚀 Sending registration');
        
        // Send data to backend
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors',
            credentials: 'include',
            body: JSON.stringify({
                name: name,
                paymentMethod: paymentMethod,
                paymentNumber: paymentNumber
            })
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Registration successful:', data);

        // Show success message with salami amount
        showSuccess(data.registration);

        // Reset form
        document.getElementById('registrationForm').reset();

        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';

    } catch (error) {
        console.error('❌ Error:', error);
        showError(error.message || 'An error occurred. Please try again.');

        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
    }
});

function showSuccess(registration) {
    const successMessage = document.getElementById('successMessage');
    const registeredName = document.getElementById('registeredName');
    const salamiAmount = document.getElementById('salamiAmount');
    
    if (registration && registration.salamiFormatted) {
        salamiAmount.textContent = registration.salamiFormatted;
    }
    
    if (registration && registration.name) {
        registeredName.textContent = `${registration.name}!`;
    }
    
    successMessage.style.display = 'flex';

    // Hide after 8 seconds
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 8000);
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    console.error('📌 Error shown to user:', message);
    errorText.innerHTML = message;
    errorMessage.style.display = 'block';

    // Hide after 8 seconds
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 8000);
}

function hideMessages() {
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
}
