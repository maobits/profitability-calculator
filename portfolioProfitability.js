const express = require("express");
const PositionManager = require("./positionManager");
const moment = require("moment");

const router = express.Router();

/**
 * Función para calcular la rentabilidad total activa utilizando `PositionManager`.
 */
const calcularRentabilidadTotalActiva = async (portfolio) => {
  let rentabilidadTotalActiva = 0;
  let totalPositions = 0;

  for (const position of portfolio) {
    const posicion = new PositionManager(
      position.precioEntrada,
      position.tipoPosicion
    );

    for (const transaccion of position.transacciones) {
      if (transaccion.tipo === "adicion") {
        posicion.adicionar(transaccion.porcentaje, transaccion.precio);
      } else if (transaccion.tipo === "toma_parcial") {
        posicion.tomaParcial(transaccion.porcentaje, transaccion.precio);
      }
    }

    const estado = await posicion.mostrarEstado(position.symbol);

    if (!isNaN(parseFloat(estado.rentabilidadTotalActiva))) {
      rentabilidadTotalActiva += parseFloat(estado.rentabilidadTotalActiva);
      totalPositions++;
    }
  }

  return totalPositions > 0
    ? (rentabilidadTotalActiva / totalPositions).toFixed(2)
    : "0.00";
};

const calcularRentabilidadTotalCerrada = async (portfolio) => {
  let rentabilidades = []; // Almacenar todas las rentabilidades procesadas
  let posicionesProcesadas = 0;

  console.log("\n📦 Datos del Portafolio Recibidos en Crudo:");
  console.log(JSON.stringify(portfolio, null, 2));

  console.log(`\n🔢 Total de Posiciones Recibidas: ${portfolio.length}`);

  console.log("\n📊 Rentabilidad Cerrada por Posición:");
  console.log(
    "──────────────────────────────────────────────────────────────────"
  );

  for (const position of portfolio) {
    console.log(
      `\n📌 Procesando posición: ${position.symbol}, Entrada: ${position.precioEntrada}`
    );

    const posicion = new PositionManager(
      position.precioEntrada,
      position.tipoPosicion
    );

    for (const transaccion of position.transacciones) {
      if (transaccion.tipo === "adicion") {
        posicion.adicionar(transaccion.porcentaje, transaccion.precio);
      } else if (transaccion.tipo === "toma_parcial") {
        posicion.tomaParcial(transaccion.porcentaje, transaccion.precio);
      }
    }

    // 🔹 Obtener el historial de transacciones con `cerrarTotal`
    const historial = posicion.cerrarTotal(position.precioEntrada);

    posicionesProcesadas++;

    console.log(`\n📊 Historial completo de la posición ${position.symbol}:`);
    console.log(JSON.stringify(historial, null, 2));

    // ✅ Aquí obtenemos el último cierre total correctamente
    const ultimaCierreTotal = historial
      .filter((h) => h.tipo === "cierre_total") // Filtramos solo los cierres totales
      .pop(); // Tomamos el último

    let rentabilidadCerrada = ultimaCierreTotal
      ? ultimaCierreTotal.rentabilidadTotal // Extraemos la rentabilidad total correcta
      : "N/A";

    console.log(
      `🔎 Rentabilidad total cerrada para ${position.symbol}:`,
      rentabilidadCerrada
    );

    // 📌 Agregar a la tabla, asegurando que mostramos la rentabilidad total cerrada correcta
    rentabilidades.push({
      "📌 Símbolo": position.symbol,
      "📅 Fecha de Cierre": position.fechaCierre || "No registrada",
      "🏁 Rentabilidad Total Cerrada (%)": rentabilidadCerrada, // Ahora sí se muestra la cerrada
    });

    console.log(
      "──────────────────────────────────────────────────────────────────"
    );
  }

  console.log("\n📊 🔹 Tabla de Rentabilidades Calculadas:");
  if (rentabilidades.length > 0) {
    console.table(rentabilidades);
  } else {
    console.log(
      "⚠️ No se encontraron posiciones con cierre total. La tabla está vacía."
    );
  }

  console.log(`\n🔢 Total de Posiciones Procesadas: ${posicionesProcesadas}`);
  console.log("\n✅ Rentabilidad Total Cerrada Calculada.");

  return {
    rentabilidadTotal: rentabilidades.map(
      (r) => r["🏁 Rentabilidad Total Cerrada (%)"]
    ), // Ahora solo devolvemos la rentabilidad cerrada
    historial: rentabilidades,
  };
};

/**
 * Ruta para procesar el cálculo del portafolio.
 */
router.post("/portfolio-profitability", async (req, res) => {
  try {
    console.log("📥 Recibiendo la solicitud de rentabilidad del portafolio...");

    const portfolio = req.body;

    if (!Array.isArray(portfolio)) {
      console.error("❌ El cuerpo de la solicitud no es un array.");
      return res.status(400).json({
        error: "Formato inválido. Se esperaba un array de posiciones.",
      });
    }

    console.log("✅ El cuerpo de la solicitud es válido.");

    // 🔹 Calcular rentabilidades y total de posiciones
    const rentabilidadTotalActiva = await calcularRentabilidadTotalActiva(
      portfolio
    );
    const rentabilidadTotalCerrada = await calcularRentabilidadTotalCerrada(
      portfolio
    );
    const totalPositions = portfolio.length;

    console.log("📊 Estado General del Portafolio:");
    console.table({
      "Rentabilidad Total Activa (%)": rentabilidadTotalActiva,
      "Rentabilidad Total Cerrada (%)": rentabilidadTotalCerrada,
      "Total de Posiciones": totalPositions,
    });

    res.json({
      rentabilidadTotalActiva,
      rentabilidadTotalCerrada: rentabilidadTotalCerrada.rentabilidadTotal, // ✅ Accede correctamente
      historial: rentabilidadTotalCerrada.historial, // ✅ Ahora se envía el historial completo
      totalPositions,
    });
  } catch (error) {
    console.error(
      "❌ Error al procesar la rentabilidad del portafolio:",
      error
    );
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
