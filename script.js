let model;
let isModelLoaded = false;

// =============================
// CONFIGURACIÓN SUPABASE
// =============================
const SUPABASE_URL = "https://wstqsqgktlbdefugtpdv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHFzcWdrdGxiZGVmdWd0cGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2ODUyNTQsImV4cCI6MjA3NDI2MTI1NH0.ArkLINOc0adJf8bFvf6W-HC-_kGucp15Lyw28ivmc1w";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Clases del modelo YOLOv8-CLS exportado a TFJS
const classNames = ['Benigno', 'Maligno'];


// =============================
// Cargar modelo en TFJS
// =============================
async function loadModel() {
    try {
        updateStatus('Cargando Modelo...', 'loading');

        // Ajusta la ruta según dónde subas el modelo
        model = await tf.loadGraphModel('model.json');

        isModelLoaded = true;
        updateStatus('Modelo Listo', 'ready');
        enableButtons();
    } catch (error) {
        console.error("Error al cargar el modelo:", error);
        updateStatus('Error al Cargar Modelo', 'error');
        document.getElementById('predictionResult').textContent =
            'Error al cargar el modelo. Por favor, recarga la página.';
    }
}


// =============================
// Estado visual del modelo
// =============================
function updateStatus(message, type) {
    const statusEl = document.getElementById('modelStatus');

    statusEl.className = `status-indicator status-${type}`;
    statusEl.innerHTML =
        type === 'loading'
            ? `<span class="loading"></span> ${message}`
            : message;

    // Ocultar cuando esté listo
    if (type === 'ready') {
        setTimeout(() => {
            statusEl.style.opacity = '0';
            setTimeout(() => statusEl.style.display = 'none', 300);
        }, 2000);
    }
}


// =============================
// Habilitar botón
// =============================
function enableButtons() {
    document.getElementById('uploadBtn').disabled = false;
}

function triggerFileInput() {
    document.getElementById('imageInput').click();
}


// =============================
// Subida de imagen
// =============================
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = function () {
        displayImage(img);
        processImage(img);
    }
    img.src = URL.createObjectURL(file);
}

function displayImage(img) {
    const previewImg = document.getElementById('previewImage');
    const placeholder = document.getElementById('placeholderText');
    const container = document.getElementById('imageContainer');

    placeholder.classList.add('hidden');
    previewImg.src = img.src;
    previewImg.classList.remove('hidden');
    container.classList.add('has-image');
}


// =============================
// PROCESAR IMAGEN Y HACER PREDICCIÓN
// =============================
async function processImage(image) {
    if (!isModelLoaded) {
        document.getElementById('predictionResult').textContent =
            'El modelo aún se está cargando. Por favor, espera...';
        return;
    }

    try {
        document.getElementById('predictionResult').innerHTML =
            '<span class="loading"></span> Analizando imagen...';

        // Preprocesamiento
        const imgTensor = tf.browser.fromPixels(image)
            .resizeNearestNeighbor([224, 224])
            .toFloat()
            .div(255.0)
            .expandDims(0);

        // Inferencia
        const prediction = await model.predict(imgTensor);
        const probs = await prediction.data();

        imgTensor.dispose();
        prediction.dispose();

        // CLASIFICACIÓN CORRECTA
        const maxIdx = probs.indexOf(Math.max(...probs));
        displayPrediction(maxIdx, probs);

        // Guardar en Supabase
        const userEmail = localStorage.getItem("userEmail");

        const { data: user, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', userEmail)
            .maybeSingle();

        if (!user || error) {
            alert('Error al obtener datos del usuario.');
            return;
        }

        // Registrar escaneo
        await registrarEscaneo(
            user.id,
            classNames[maxIdx],
            probs[maxIdx] * 100
        );

    } catch (error) {
        console.error("Error al hacer la predicción:", error);
        document.getElementById('predictionResult').textContent =
            'Error al analizar la imagen. Por favor, intenta de nuevo.';
    }
}


// =============================
// MOSTRAR RESULTADO DE PREDICCIÓN
// =============================
function displayPrediction(classIndex, probabilities) {
    const resultEl = document.getElementById('predictionResult');
    const confidenceBar = document.getElementById('confidenceBar');
    const confidenceFill = document.getElementById('confidenceFill');

    const predictedClass = classNames[classIndex];
    const confidence = probabilities[classIndex];

    // Render del texto
    resultEl.innerHTML = `
        <div style="font-size: 1.5rem; margin-bottom: 10px;">
            ${predictedClass === 'Maligno' ? '⚠' : '✅'} ${predictedClass}
        </div>
        <div style="font-size: 1rem; opacity: 0.8;">
            Confianza: ${(confidence * 100).toFixed(1)}%
        </div>
    `;

    // Barra de confianza
    confidenceBar.classList.remove('hidden');
    confidenceFill.style.width = `${confidence * 100}%`;
    confidenceFill.style.background =
        classIndex === 1
            ? 'linear-gradient(45deg, #ff6b6b, #ee5a52)'     // Maligno
            : 'linear-gradient(45deg, #a3d977, #68d391)';    // Benigno
}


// =============================
// REGISTRAR ESCANEO EN SUPABASE
// =============================
async function registrarEscaneo(usuarioId, resultado, confianza) {
    try {
        const { error: insertError } = await supabase
            .from('escaneos')
            .insert([{ usuario_id: usuarioId, resultado, confianza }]);

        if (insertError) throw insertError;

        // Obtener usuario
        const { data: user, error: userError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', usuarioId)
            .maybeSingle();

        if (userError || !user) throw userError;

        // Actualizar contador y último resultado
        const { error: updateError } = await supabase
            .from('usuarios')
            .update({
                numero_escaneos: user.numero_escaneos + 1,
                ultimo_resultado: resultado,
                ultima_confianza: parseFloat(confianza.toFixed(2))
            })
            .eq('id', usuarioId);

        if (updateError) throw updateError;

        console.log("Escaneo registrado correctamente.");

    } catch (err) {
        console.error("Error al registrar escaneo:", err);
    }
}


// =============================
// INICIALIZAR MODELO AL CARGAR
// =============================
window.onload = function () {
    loadModel();
};
