
const CONFIG = {
    speakers: 8,              
    models: [
        "model1",             
        "model2",             
        "model3",             
        "model4"              
    ],
    clonesPerModel: 10,       
    audioBasePath: "audio/"   
};

const YANDEX_DISK_TOKEN = 'y0__xDyxfrOCBilkz4gv73MwxZJIyg4MMbw4F5PuVzVsBDZ7cBnDQ';
const YANDEX_DISK_FOLDER = '/VoiceEvaluation/';

async function uploadToYandexDisk(filename, content, contentType = 'application/json') {
    try {
        await createYandexDiskFolder();
        
        const uploadUrl = await getYandexDiskUploadUrl(filename);
        
        const blob = new Blob([content], { type: contentType });
        
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            body: blob
        });
        
        if (response.ok) {
            console.log(`✅ Файл ${filename} загружен на Яндекс.Диск`);
            return true;
        } else {
            console.error('❌ Ошибка загрузки:', await response.text());
            return false;
        }
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        return false;
    }
}

async function createYandexDiskFolder() {
    const url = `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(YANDEX_DISK_FOLDER)}`;
    
    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `OAuth ${YANDEX_DISK_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok || response.status === 409) {
            return true;
        }
    } catch (error) {

    }
    
    return true;
}

async function getYandexDiskUploadUrl(filename) {
    const filepath = YANDEX_DISK_FOLDER + filename;
    const url = `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(filepath)}&overwrite=true`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `OAuth ${YANDEX_DISK_TOKEN}`
        }
    });
    
    const data = await response.json();
    return data.href; 
}



async function autoSendResults() {

    showNotification('📤 Отправка результатов...', 'info');
    
    const evaluatorId = evaluationData.evaluatorId;

    const jsonContent = JSON.stringify(evaluationData, null, 2);
    const jsonFilename = `voice_evaluation_${evaluatorId}.json`;
    

    const csvContent = generateCSV();
    const csvFilename = `voice_evaluation_${evaluatorId}.csv`;

    const jsonSuccess = await uploadToYandexDisk(jsonFilename, jsonContent, 'application/json');
    const csvSuccess = await uploadToYandexDisk(csvFilename, csvContent, 'text/csv');
    
    if (jsonSuccess && csvSuccess) {
        showNotification('✅ Результаты успешно отправлены!', 'success');
    } else if (jsonSuccess || csvSuccess) {
        showNotification('⚠️ Часть результатов отправлена. Скачайте резервные копии.', 'warning');
    } else {
        showNotification('❌ Не удалось отправить результаты. Пожалуйста, скачайте файлы вручную.', 'error');
    }
}

function generateCSV() {
    let csv = 'Type,Speaker,Model,Clone_ID,Rating_Type,Value\n';
    
    // Этап 1
    evaluationData.stage1.forEach(item => {
        csv += `Stage1,${item.speaker},-,-,Protection_Quality,${item.protection_quality}\n`;
    });
    
    // Этап 2
    evaluationData.stage2.forEach(item => {
        csv += `Stage2,${item.speaker},${item.model},${item.clone_id},Similarity,${item.similarity}\n`;
        csv += `Stage2,${item.speaker},${item.model},${item.clone_id},Quality,${item.quality}\n`;
    });
    
    return csv;
}

function showNotification(message, type = 'info') {
    const colors = {
        'info': '#007bff',
        'success': '#28a745',
        'warning': '#ffc107',
        'error': '#dc3545'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    notification.innerHTML = `<strong>${message}</strong>`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}










let evaluationData = {
    evaluatorId: generateEvaluatorId(),
    timestamp: new Date().toISOString(),
    stage1: [],
    stage2: []
};

let currentStage = 'welcome';
let currentSpeaker = 1;
let currentModel = 0;
let currentClone = 1;


document.addEventListener('DOMContentLoaded', function() {
    loadProgress();
    setupRatingButtons();
});


function generateEvaluatorId() {
    return 'eval_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}



function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById('screen-' + screenId).classList.add('active');
    currentStage = screenId;
    saveProgress();

    window.scrollTo({
        top: 0,
        behavior: 'auto' // Мгновенная прокрутка
    });
}



function startEvaluation() {
    currentSpeaker = 1;
    showScreen('stage1');
    loadStage1Audio();
    updateProgressStage1();
}



function loadStage1Audio() {
    const speakerPath = `${CONFIG.audioBasePath}speaker_${String(currentSpeaker).padStart(2, '0')}/`;
    
    document.getElementById('audio-original-stage1').src = speakerPath + 'original.ogg';
    document.getElementById('audio-protected-stage1').src = speakerPath + 'protected.ogg';
    
    document.getElementById('audio-original-stage1').load();
    document.getElementById('audio-protected-stage1').load();
    
    loadSavedRating('stage1', currentSpeaker);
    
    document.getElementById('btn-prev-stage1').disabled = (currentSpeaker === 1);
}

function updateProgressStage1() {
    const progress = (currentSpeaker / CONFIG.speakers) * 100;
    document.getElementById('progress-stage1').style.width = progress + '%';
    document.getElementById('current-speaker-stage1').textContent = currentSpeaker;
}

function nextStage1() {
    const rating = getSelectedRating('rating-stage1');
    if (!rating) {
        alert('Пожалуйста, выберите оценку');
        return;
    }
    
    saveStage1Rating(currentSpeaker, rating);
    
    if (currentSpeaker < CONFIG.speakers) {
        currentSpeaker++;
        loadStage1Audio();
        updateProgressStage1();
        clearSelection('rating-stage1');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        showScreen('transition');
    }
}

function previousStage1() {
    if (currentSpeaker > 1) {
        currentSpeaker--;
        loadStage1Audio();
        updateProgressStage1();
        clearSelection('rating-stage1');
    }
}

function saveStage1Rating(speaker, rating) {
    const existingIndex = evaluationData.stage1.findIndex(item => item.speaker === speaker);
    
    if (existingIndex >= 0) {
        evaluationData.stage1[existingIndex].protection_quality = rating;
    } else {
        evaluationData.stage1.push({
            speaker: speaker,
            protection_quality: rating
        });
    }
    
    saveProgress();
}



function startStage2() {
    currentSpeaker = 1;
    currentModel = 0;
    currentClone = 1;
    showScreen('stage2');
    loadStage2Audio();
    updateProgressStage2();
}



function loadStage2Audio() {
    const speakerPath = `${CONFIG.audioBasePath}speaker_${String(currentSpeaker).padStart(2, '0')}/`;
    const modelName = CONFIG.models[currentModel];
    
    document.getElementById('audio-reference-stage2').src = speakerPath + 'original.ogg';
    document.getElementById('audio-clone-stage2').src = 
        speakerPath + `clones/${modelName}/clone_${String(currentClone).padStart(2, '0')}.wav`;
    

    document.getElementById('audio-reference-stage2').load();
    document.getElementById('audio-clone-stage2').load();
    

    loadSavedRatingsStage2();
    

    const isFirst = (currentSpeaker === 1 && currentModel === 0 && currentClone === 1);
    document.getElementById('btn-prev-stage2').disabled = isFirst;
}

function updateProgressStage2() {
    const totalItems = CONFIG.speakers * CONFIG.models.length * CONFIG.clonesPerModel;
    const currentItem = 
        (currentSpeaker - 1) * CONFIG.models.length * CONFIG.clonesPerModel +
        currentModel * CONFIG.clonesPerModel +
        currentClone;
    
    const progress = (currentItem / totalItems) * 100;
    document.getElementById('progress-stage2').style.width = progress + '%';
    
    document.getElementById('current-speaker-stage2').textContent = currentSpeaker;
    document.getElementById('current-model-stage2').textContent = currentModel + 1;
    document.getElementById('current-clone-stage2').textContent = currentClone;
}

function nextStage2() {
    const similarity = getSelectedRating('rating-similarity');
    const quality = getSelectedRating('rating-quality');
    
    if (!similarity || !quality) {
        alert('Пожалуйста, выберите обе оценки');
        return;
    }
    

    saveStage2Rating(currentSpeaker, CONFIG.models[currentModel], currentClone, similarity, quality);
    

    if (moveToNextStage2Item()) {
        loadStage2Audio();
        updateProgressStage2();
        clearSelection('rating-similarity');
        clearSelection('rating-quality');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        // Завершили Этап 2
        showScreen('complete');
        
        setTimeout(() => {
            autoSendResults();
        }, 1000);
    }
}

function previousStage2() {
    if (moveToPreviousStage2Item()) {
        loadStage2Audio();
        updateProgressStage2();
        clearSelection('rating-similarity');
        clearSelection('rating-quality');
    }
}

function moveToNextStage2Item() {
    currentClone++;
    
    if (currentClone > CONFIG.clonesPerModel) {
        currentClone = 1;
        currentModel++;
        
        if (currentModel >= CONFIG.models.length) {
            currentModel = 0;
            currentSpeaker++;
            
            if (currentSpeaker > CONFIG.speakers) {
                return false; 
            }
        }
    }
    
    return true;
}

function moveToPreviousStage2Item() {
    currentClone--;
    
    if (currentClone < 1) {
        currentClone = CONFIG.clonesPerModel;
        currentModel--;
        
        if (currentModel < 0) {
            currentModel = CONFIG.models.length - 1;
            currentSpeaker--;
            
            if (currentSpeaker < 1) {
                return false; 
            }
        }
    }
    
    return true;
}

function saveStage2Rating(speaker, model, cloneId, similarity, quality) {
    const existingIndex = evaluationData.stage2.findIndex(
        item => item.speaker === speaker && 
                item.model === model && 
                item.clone_id === cloneId
    );
    
    if (existingIndex >= 0) {
        evaluationData.stage2[existingIndex].similarity = similarity;
        evaluationData.stage2[existingIndex].quality = quality;
    } else {
        evaluationData.stage2.push({
            speaker: speaker,
            model: model,
            clone_id: cloneId,
            similarity: similarity,
            quality: quality
        });
    }
    
    saveProgress();
}



function setupRatingButtons() {
    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const parent = this.parentElement;
            const ratingId = parent.id;
            

            parent.querySelectorAll('.rating-btn').forEach(b => {
                b.classList.remove('selected');
            });
            

            this.classList.add('selected');
            

            const stage = ratingId.includes('stage1') ? 'stage1' : 'stage2';
            checkRatingsComplete(stage);
        });
    });
}

function checkRatingsComplete(stage) {
    if (stage === 'stage1') {
        const rating = getSelectedRating('rating-stage1');
        document.getElementById('btn-next-stage1').disabled = !rating;
    } else {
        const similarity = getSelectedRating('rating-similarity');
        const quality = getSelectedRating('rating-quality');
        document.getElementById('btn-next-stage2').disabled = !(similarity && quality);
    }
}

function getSelectedRating(ratingId) {
    const selected = document.querySelector(`#${ratingId} .rating-btn.selected`);
    return selected ? parseInt(selected.dataset.value) : null;
}

function clearSelection(ratingId) {
    document.querySelectorAll(`#${ratingId} .rating-btn`).forEach(btn => {
        btn.classList.remove('selected');
    });
}

function selectRating(ratingId, value) {
    clearSelection(ratingId);
    const btn = document.querySelector(`#${ratingId} .rating-btn[data-value="${value}"]`);
    if (btn) {
        btn.classList.add('selected');
    }
}

function loadSavedRating(stage, speaker) {
    if (stage === 'stage1') {
        const saved = evaluationData.stage1.find(item => item.speaker === speaker);
        if (saved) {
            selectRating('rating-stage1', saved.protection_quality);
            checkRatingsComplete('stage1');
        }
    }
}

function loadSavedRatingsStage2() {
    const saved = evaluationData.stage2.find(
        item => item.speaker === currentSpeaker && 
                item.model === CONFIG.models[currentModel] && 
                item.clone_id === currentClone
    );
    
    if (saved) {
        selectRating('rating-similarity', saved.similarity);
        selectRating('rating-quality', saved.quality);
        checkRatingsComplete('stage2');
    }
}



function saveProgress() {
    localStorage.setItem('voiceEvaluationData', JSON.stringify(evaluationData));
    localStorage.setItem('voiceEvaluationProgress', JSON.stringify({
        currentStage: currentStage,
        currentSpeaker: currentSpeaker,
        currentModel: currentModel,
        currentClone: currentClone
    }));
}

function loadProgress() {
    const savedData = localStorage.getItem('voiceEvaluationData');
    const savedProgress = localStorage.getItem('voiceEvaluationProgress');
    
    if (savedData) {
        evaluationData = JSON.parse(savedData);
    }
    
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        currentStage = progress.currentStage;
        currentSpeaker = progress.currentSpeaker;
        currentModel = progress.currentModel;
        currentClone = progress.currentClone;
        
        // Можно добавить функцию для продолжения с того места, где остановились
        //showScreen(currentStage);
    }
}


function exportResults() {
    const dataStr = JSON.stringify(evaluationData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `voice_evaluation_${evaluationData.evaluatorId}.json`;
    link.click();
}

function exportResultsCSV() {
    let csv = 'Type,Speaker,Model,Clone_ID,Rating_Type,Value\n';
    
    evaluationData.stage1.forEach(item => {
        csv += `Stage1,${item.speaker},-,-,Protection_Quality,${item.protection_quality}\n`;
    });
    
    evaluationData.stage2.forEach(item => {
        csv += `Stage2,${item.speaker},${item.model},${item.clone_id},Similarity,${item.similarity}\n`;
        csv += `Stage2,${item.speaker},${item.model},${item.clone_id},Quality,${item.quality}\n`;
    });
    
    const dataBlob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `voice_evaluation_${evaluationData.evaluatorId}.csv`;
    link.click();
}
