let model;
let isModelLoaded = false;

// Configuración de Supabase (Asegúrate de incluirlo al principio del archivo JS)
const SUPABASE_URL = "https://wstqsqgktlbdefugtpdv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHFzcWdrdGxiZGVmdWd0cGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2ODUyNTQsImV4cCI6MjA3NDI2MTI1NH0.ArkLINOc0adJf8bFvf6W-HC-_kGucp15Lyw28ivmc1w";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Nombres de las clases para las predicciones del modelo
const classNames = ['Benigno', 'Maligno'];

// Cargar el modelo de TensorFlow
async function loadModel() {
    try {
        updateStatus('Cargando Modelo...', 'loading');
        model = await tf.loadGraphModel('model.json');
        isModelLoaded = true;
        updateStatus('Modelo Listo', 'ready');
        enableButtons();
    } catch (error) {
        console.error("Error al cargar el modelo:", error);
        updateStatus('Error al Cargar Modelo', 'error');
        document.getElementById('predictionResult').textContent = 'Error al cargar el modelo. Por favor, recarga la página.';
    }
}

// Actualiza el estado del modelo
function updateStatus(message, type) {
    const statusEl = document.getElementById('modelStatus');
    statusEl.className = `status-indicator status-${type}`;
    statusEl.innerHTML = type === 'loading' ? 
        `<span class="loading"></span> ${message}` : 
        message;
    
    if (type === 'ready') {
        setTimeout(() => {
            statusEl.style.opacity = '0';
            setTimeout(() => statusEl.style.display = 'none', 300);
        }, 2000);
    }
}

// Habilitar el botón de subir imagen
function enableButtons() {
    document.getElementById('uploadBtn').disabled = false;
}

function triggerFileInput() {
    document.getElementById('imageInput').click();
}

// Manejar subida de imagen
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = function() {
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

// Procesar la imagen y hacer una predicción
async function processImage(image) {
    if (!isModelLoaded) {
        document.getElementById('predictionResult').textContent = 'El modelo aún se está cargando. Por favor, espera...';
        return;
    }

    try {
        // Mostrar estado de carga
        document.getElementById('predictionResult').innerHTML = 
            '<span class="loading"></span> Analizando imagen...';

        // Preprocesar la imagen
        const imgTensor = tf.browser.fromPixels(image)
            .resizeNearestNeighbor([224, 224])
            .toFloat()
            .div(255.0)
            .expandDims(0);

        // Hacer predicción
        const prediction = await model.predict(imgTensor);
        const predictionData = await prediction.data();
        
        // Limpiar tensores
        imgTensor.dispose();
        prediction.dispose();

        // Mostrar resultados
        displayPrediction(predictionData[1]);

        // Obtener datos del usuario y guardar escaneo en Supabase
        const userEmail = localStorage.getItem("userEmail");
        const { data: user, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', userEmail)
            .maybeSingle();

        if (error || !user) {
            alert('Error al obtener datos del usuario.');
            return;
        }

        // Registrar escaneo
        await registrarEscaneo(user.id, predictionData[1] > 0.5 ? "Maligno" : "Benigno", predictionData[1] * 100);

        // Incrementar el número de escaneos
        const { error: updateError } = await supabase
            .from('usuarios')
            .update({ numero_escaneos: user.numero_escaneos + 1 })
            .eq('id', user.id);

        if (updateError) {
            console.error('Error al actualizar contador de escaneos:', updateError);
            alert('Hubo un problema al actualizar el contador de escaneos.');
            return;
        }

        // Redirigir a la vista definitiva (con los datos de escaneos actualizados)
        window.location.href = "definitivo.html";
    } catch (error) {
        console.error("Error al hacer la predicción:", error);
        document.getElementById('predictionResult').textContent = 
            'Error al analizar la imagen. Por favor, intenta de nuevo.';
    }
}

// Mostrar el resultado de la predicción
function displayPrediction(confidence) {
    const resultEl = document.getElementById('predictionResult');
    const confidenceBar = document.getElementById('confidenceBar');
    const confidenceFill = document.getElementById('confidenceFill');

    // Para clasificación binaria: >0.5 = Maligno, <=0.5 = Benigno
    const isMalignant = confidence > 0.5;
    const displayConfidence = isMalignant ? confidence : 1 - confidence;
    const prediction = isMalignant ? 'Maligno' : 'Benigno';
    
    // Actualizar texto del resultado y estilo
    resultEl.className = `prediction-result result-${prediction.toLowerCase()}`;
    resultEl.innerHTML = `
        <div style="font-size: 1.5rem; margin-bottom: 10px;">
            ${prediction === 'Maligno' ? '⚠️' : '✅'} ${prediction}
        </div>
        <div style="font-size: 1rem; opacity: 0.8;">
            Confianza: ${(displayConfidence * 100).toFixed(1)}%
        </div>
    `;

    // Actualizar barra de confianza
    confidenceBar.classList.remove('hidden');
    confidenceFill.style.width = `${displayConfidence * 100}%`;
    confidenceFill.style.background = isMalignant ? 
        'linear-gradient(45deg, #ff6b6b, #ee5a52)' : 
        'linear-gradient(45deg, #a3d977, #68d391)';
}

// Registrar escaneo en Supabase
// Registrar escaneo en Supabase
// Registrar escaneo en Supabase
// Registrar escaneo en Supabase
// Registrar escaneo en Supabase
// Registrar escaneo en Supabase
// Registrar escaneo en Supabase
// Registrar escaneo en Supabase
// Registrar escaneo en Supabase
async function registrarEscaneo(usuarioId, resultado, confianza) {
    try {
        // 1️⃣ Insertar escaneo en la base de datos
        const { error: insertError } = await supabase
            .from('escaneos')
            .insert([{ usuario_id: usuarioId, resultado, confianza }]);

        if (insertError) {
            console.error('Error al insertar escaneo:', insertError);
            throw new Error('Error al insertar escaneo');
        }

        // 2️⃣ Actualizar el contador de escaneos en la tabla usuarios
        const { data: user, error: userError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', usuarioId)
            .maybeSingle();

        if (userError || !user) {
            console.error('Error al obtener datos del usuario:', userError);
            throw new Error('Error al obtener datos del usuario');
        }

        // Actualizamos el contador de escaneos
        const { error: updateEscaneosError } = await supabase
            .from('usuarios')
            .update({
                numero_escaneos: user.numero_escaneos + 1  // Incrementar el número de escaneos manualmente
            })
            .eq('id', usuarioId);

        if (updateEscaneosError) {
            console.error('Error al actualizar el contador de escaneos:', updateEscaneosError);
            throw new Error('Error al actualizar el contador de escaneos');
        }

        // 3️⃣ Actualizar el último resultado y la última confianza en la tabla usuarios
        const { error: updateResultError } = await supabase
            .from('usuarios')
            .update({
                ultimo_resultado: resultado,  // Guardar el último resultado (Benigno/Maligno)
                ultima_confianza: parseFloat(confianza.toFixed(2))   // Guardar la última confianza (por ejemplo: 97.78)
            })
            .eq('id', usuarioId);

        if (updateResultError) {
            console.error('Error al actualizar los resultados:', updateResultError);
            throw new Error('Error al actualizar los resultados');
        }

        // Confirmación en consola (sin redirección a definitivo.html)
        console.log('Escaneo guardado correctamente. No redirigiendo aún a definitivo.html.');

        // Si todo funciona correctamente, puedes redirigir a definitivo.html aquí
        // Descomenta la siguiente línea cuando todo funcione bien:
        // window.location.href = "definitivo.html"; 

    } catch (err) {
        console.error("Error al registrar el escaneo:", err);
        console.log("Hubo un error al guardar el escaneo.");
    }
}






// Inicializar el modelo cuando cargue la página
window.onload = function() {
    loadModel();
};
