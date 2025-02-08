const express = require("express");
const cors = require("cors");
const positionRoutes = require("./portfolioProfitability"); // Importa la nueva ruta
const PositionManager = require("./positionManager");

const app = express();
const port = 3600;

// Middleware
app.use(express.json()); // 🔹 Necesario para procesar JSON en las solicitudes
app.use(cors()); // 🔹 Habilita CORS para cualquier origen

// Rutas
app.use(positionRoutes); // 🔹 Integrar la nueva ruta del portafolio

// Endpoint para procesar transacciones individuales
app.post("/procesar-transacciones", async (req, res) => {
    const { tipoPosicion, precioEntrada, symbol, transacciones } = req.body;

    if (!tipoPosicion || !precioEntrada || !symbol || !Array.isArray(transacciones)) {
        return res.status(400).json({ error: "Invalid request format" });
    }

    const posicion = new PositionManager(precioEntrada, tipoPosicion);

    for (const transaccion of transacciones) {
        if (transaccion.tipo === "adicion") {
            posicion.adicionar(transaccion.porcentaje, transaccion.precio);
        } else if (transaccion.tipo === "toma_parcial") {
            posicion.tomaParcial(transaccion.porcentaje, transaccion.precio);
        } else if (transaccion.tipo === "cierre_total") {
            return res.json({
                historial: posicion.cerrarTotal(transaccion.precio),
                estadoActual: await posicion.mostrarEstado(symbol),
            });
        }
    }

    const resultado = await posicion.mostrarEstado(symbol);
    res.json({ historial: posicion.historial, estadoActual: resultado });
});

// Iniciar el servidor en la IP pública
const HOST = '0.0.0.0'; // Escuchar en todas las interfaces, incluida la IP pública
app.listen(port, HOST, () => {
    console.log(`✅ Servidor ejecutándose en http://localhost:${port}`);
});
