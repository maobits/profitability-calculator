const express = require("express");
const cors = require("cors");
const fs = require("fs");
const https = require("https");
const positionRoutes = require("./portfolioProfitability"); // Importa la nueva ruta
const PositionManager = require("./positionManager");

const app = express();
const port = 3600;
const isProduction = true; // Cambiar a true para producción

// 🔹 Middleware
app.use(express.json()); // Necesario para procesar JSON en las solicitudes

// 🔹 Habilita CORS para cualquier origen
app.use(
  cors({
    origin: "*", // Permite solicitudes desde cualquier origen
    methods: ["GET", "POST", "PATCH", "DELETE"], // Métodos HTTP permitidos
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"], // Encabezados permitidos
  })
);

// 🔹 Integrar la nueva ruta del portafolio
app.use(positionRoutes);

// 🔹 Endpoint para procesar transacciones individuales
app.post("/procesar-transacciones", async (req, res) => {
  const { tipoPosicion, precioEntrada, symbol, transacciones } = req.body;

  if (
    !tipoPosicion ||
    !precioEntrada ||
    !symbol ||
    !Array.isArray(transacciones)
  ) {
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

const HOST = "0.0.0.0"; // Escuchar en todas las interfaces, incluida la IP pública

if (isProduction) {
  // 🔹 Cargar certificados SSL solo en producción
  const sslOptions = {
    key: fs.readFileSync("/etc/letsencrypt/live/ttrading.shop/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/ttrading.shop/fullchain.pem"),
  };

  https.createServer(sslOptions, app).listen(port, HOST, () => {
    console.log(`✅ Servidor ejecutándose en https://ttrading.shop:${port}`);
  });
} else {
  // 🔹 Servidor HTTP en desarrollo
  app.listen(port, HOST, () => {
    console.log(
      `✅ Servidor en modo desarrollo ejecutándose en http://localhost:${port}`
    );
  });
}
