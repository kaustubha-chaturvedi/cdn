document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    const generateForm = document.getElementById('generate-form');
    const generatedImagesSection = document.getElementById('generated-images');
    const generatedPrompt = document.getElementById('generated-prompt');
    const imageGrid = document.getElementById('image-grid');
    const generateBtn = document.getElementById('generate-btn');
    const spinner = document.getElementById('spinner');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const historyBtn = document.getElementById('history-btn');
    const backBtn = document.getElementById('back-btn');
    const historySection = document.getElementById('history-section');
    const historyGrid = document.getElementById('history-grid');
    const historySpinner = document.getElementById('history-spinner');
    const paginationContainer = document.getElementById('pagination-container');
    const slider = document.getElementById('num_images');
    const sliderValue = document.getElementById('slider-value');

    // Check login status
    checkLoginStatus();

    // Event listeners
    authForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    historyBtn.addEventListener('click', fetchImageHistory);
    backBtn.addEventListener('click', showGenerateForm);
    slider.addEventListener('input', updateSliderValue);

    // Initialize slider value
    updateSliderValue();

    // Functions
    function checkLoginStatus() {
        const isLoggedIn = localStorage.getItem('logged_in');
        const tokenExpiresAt = localStorage.getItem('token_expires_at');

        if (isLoggedIn === 'true' && tokenExpiresAt && Date.now() < parseInt(tokenExpiresAt)) {
            authForm.style.display = 'none';
            generateForm.style.display = 'block';
            logoutBtn.style.display = 'block';
        } else {
            autoLogout();
        }
    }

    function autoLogout() {
        if (localStorage.getItem('logged_in') === 'true') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('logged_in');
            localStorage.removeItem('token_expires_at');
            localStorage.removeItem('user_email');
        }

        authForm.style.display = 'block';
        generateForm.style.display = 'none';
        generatedImagesSection.style.display = 'none';
        historySection.style.display = 'none';
        logoutBtn.style.display = 'none';
    }

    function updateSliderValue() {
        sliderValue.textContent = slider.value;
    }

    async function handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    email: email,
                    password: password,
                }),
            });

            if (!response.ok) {
                throw new Error('Email/Password Incorrect');
            }

            const data = await response.json();
            const accessToken = data.access_token;
            const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('logged_in', 'true');
            localStorage.setItem('token_expires_at', expiresAt);
            localStorage.setItem('user_email', email);

            authForm.style.display = 'none';
            generateForm.style.display = 'block';
            logoutBtn.style.display = 'block';
        } catch (error) {
            alert('Login failed: ' + error.message);
        }
    }

    function handleLogout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('logged_in');
        localStorage.removeItem('token_expires_at');
        localStorage.removeItem('user_email');
        authForm.style.display = 'block';
        generateForm.style.display = 'none';
        generatedImagesSection.style.display = 'none';
        historySection.style.display = 'none';
        logoutBtn.style.display = 'none';
    }

    function showGenerateForm() {
        historySection.style.display = 'none';
        generateForm.style.display = 'block';
        backBtn.style.display = 'none';
        historyBtn.style.display = 'block';
    }

    async function fetchImageHistory() {
        historySpinner.style.display = 'inline-block';
        historyBtn.disabled = true;

        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            alert('You must log in first.');
            return;
        }

        const userEmail = localStorage.getItem('user_email');
        if (!userEmail) {
            alert('User email not found. Please log in again.');
            return;
        }

        try {
            const response = await fetch(`/images-history?email=${encodeURIComponent(userEmail)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch image history');
            }

            const data = await response.json();
            const historyData = data.images;

            if (!Array.isArray(historyData)) {
                throw new Error('Invalid response format: Expected an array inside "images"');
            }

            if (historyData.length === 0) {
                alert('No history found.');
                historySpinner.style.display = 'none';
                historyBtn.disabled = false;
                return;
            }

            // Hide generation form, show history section
            generateForm.style.display = 'none';
            historySection.style.display = 'block';
            historyGrid.innerHTML = '';

            // Show back button
            historyBtn.style.display = 'none';
            backBtn.style.display = 'block';

            // Render pagination
            renderPagination(historyData);
        } catch (error) {
            alert('Error fetching history: ' + error.message);
        } finally {
            historySpinner.style.display = 'none';
            historyBtn.disabled = false;
        }
    }

    function renderPagination(historyData) {
        const itemsPerPage = 6;
        let currentPage = 1;
        const totalPages = Math.ceil(historyData.length / itemsPerPage);

        function displayPage(page) {
            historyGrid.innerHTML = ''; // Clear existing content
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const pageItems = historyData.slice(start, end);

            pageItems.forEach(item => {
                const card = document.createElement('div');
                card.className = 'col-md-4 mb-3';
                card.innerHTML = `
                    <div class="card">
                        <img src="${item.image_url}" class="card-img-top" alt="Generated Image">
                        <div class="card-body">
                            <p class="card-text"><strong>Prompt:</strong> ${item.prompt}</p>
                            <p class="card-text"><small class="text-muted">${new Date(item.timestamp).toLocaleString()}</small></p>
                        </div>
                    </div>
                `;
                historyGrid.appendChild(card);
            });

            updatePagination();
        }

        function updatePagination() {
            paginationContainer.innerHTML = ''; // Clear existing pagination

            for (let i = 1; i <= totalPages; i++) {
                const pageItem = document.createElement('div');
                pageItem.className = `page-item ${i === currentPage ? 'active' : ''}`;
                pageItem.textContent = i;
                pageItem.onclick = () => {
                    currentPage = i;
                    displayPage(currentPage);
                };
                paginationContainer.appendChild(pageItem);
            }
        }

        // Initial display
        displayPage(1);
    }
});

// Image generation form submission
async function handleSubmit(e) {
    e.preventDefault();
    const prompt = document.getElementById('prompt').value;
    const numImages = document.getElementById('num_images').value;
    const accessToken = localStorage.getItem('access_token');
    const generateBtn = document.getElementById('generate-btn');
    const spinner = document.getElementById('spinner');

    if (!accessToken) {
        alert('You must log in first.');
        return;
    }

    if (Date.now() > parseInt(localStorage.getItem('token_expires_at'))) {
        alert('Your session has expired. Please log in again.');
        autoLogout();
        return;
    }

    spinner.style.display = 'inline-block';
    generateBtn.disabled = true;

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ prompt: prompt, num_images: parseInt(numImages) }),
        });

        if (!response.ok) {
            throw new Error('Image generation request failed: ' + response.statusText);
        }

        const data = await response.json();

        if (data.task_id) {
            checkTaskStatus(data.task_id, 2 * 60 * 1000); // 2 minute timeout
        } else if (data.images) {
            displayGeneratedImages(data.images, prompt);
        } else {
            throw new Error('Unexpected response from server');
        }
    } catch (error) {
        alert('Error generating images: ' + error.message);
        spinner.style.display = 'none';
        generateBtn.disabled = false;
    }
}

async function checkTaskStatus(taskId, timeout) {
    const spinner = document.getElementById('spinner');
    const generateBtn = document.getElementById('generate-btn');
    const startTime = Date.now();

    const interval = setInterval(async () => {
        try {
            if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                spinner.style.display = 'none';
                generateBtn.disabled = false;
                alert('Image generation took too long. Please try again.');
                return;
            }

            const response = await fetch(`/task-status?task_id=${taskId}`);
            if (!response.ok) throw new Error('Failed to fetch task status');

            const data = await response.json();

            if (data.status === 'completed') {
                clearInterval(interval);
                spinner.style.display = 'none';
                generateBtn.disabled = false;
                const prompt = document.getElementById('prompt').value;
                displayGeneratedImages(data.images, prompt);
            } else if (data.status === 'failed') {
                clearInterval(interval);
                spinner.style.display = 'none';
                generateBtn.disabled = false;
                alert('Image generation failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            clearInterval(interval);
            spinner.style.display = 'none';
            generateBtn.disabled = false;
            alert('Error checking task status: ' + error.message);
        }
    }, 3000); // Check every 3 seconds
}

function displayGeneratedImages(images, promptText) {
    const imageGrid = document.getElementById('image-grid');
    const generatedImagesSection = document.getElementById('generated-images');
    const generatedPrompt = document.getElementById('generated-prompt');
    const downloadAllBtn = document.getElementById('download-all-btn');

    imageGrid.innerHTML = '';
    generatedImagesSection.style.display = 'block';
    generatedPrompt.textContent = promptText || 'Generated Images';

    if (!Array.isArray(images)) {
        console.error("Expected an array but received:", images);
        alert("Error: Invalid image response format.");
        return;
    }

    const imageUrls = [];

    images.forEach((image) => {
        // Extract the URL from the image object if needed
        const url = image.image_url || image;

        const col = document.createElement('div');
        col.className = 'image-item';

        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Generated Image';

        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'View';
        viewBtn.className = 'download-link';
        viewBtn.style.backgroundColor = '#007bff';
        viewBtn.style.marginBottom = '10px';
        viewBtn.onclick = () => openModal(url);

        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download';
        downloadBtn.className = 'download-link';
        downloadBtn.style.cursor = 'pointer';
        downloadBtn.onclick = () => downloadImage(url);

        col.appendChild(img);
        col.appendChild(viewBtn);
        col.appendChild(downloadBtn);
        imageGrid.appendChild(col);

        imageUrls.push(url);
    });

    downloadAllBtn.style.display = 'block';
    downloadAllBtn.onclick = () => downloadAllImages(imageUrls);
}

async function downloadImage(url) {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error('Network response was not ok');

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const tempLink = document.createElement('a');
        tempLink.href = blobUrl;
        tempLink.download = `generated_image_${Date.now()}.jpg`;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Download failed:', error);
        alert('Failed to download image. Right-click and choose "Save As" instead.');
    }
}

function downloadAllImages(imageUrls) {
    const zip = new JSZip();
    const folder = zip.folder('generated_images');

    let downloadPromises = imageUrls.map((url, index) => {
        return fetch(url)
            .then(response => response.blob())
            .then(blob => {
                folder.file(`image_${index + 1}.jpg`, blob);
            });
    });

    Promise.all(downloadPromises).then(() => {
        zip.generateAsync({ type: 'blob' }).then(content => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'generated_images.zip';
            link.click();
        });
    });
}

function openModal(imageUrl) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    modalImg.src = imageUrl;
    modal.style.display = 'flex';

    // Close modal when clicking outside the modal content
    modal.addEventListener('click', outsideClickHandler);
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';

    // Remove event listener when modal is closed
    modal.removeEventListener('click', outsideClickHandler);
}

function outsideClickHandler(event) {
    const modalContent = document.querySelector('#imageModal > div');
    if (!modalContent.contains(event.target)) {
        closeModal();
    }
}