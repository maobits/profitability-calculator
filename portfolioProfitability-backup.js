const express = require("express");
const PositionManager = require("./positionManager"); // Asegúrate de que este archivo esté correctamente implementado
const moment = require("moment");

const router = express.Router();

router.post("/portfolio-profitability", async (req, res) => {
  try {
    console.log("📥 Recibiendo la solicitud de rentabilidad del portafolio...");

    const portfolio = req.body;

    // 🔹 Mostrar el cuerpo de la solicitud recibido
    console.log(
      "🔍 Datos recibidos del portafolio:",
      JSON.stringify(portfolio, null, 2)
    );

    // 🔹 Validar que el cuerpo de la solicitud sea un array
    if (!Array.isArray(portfolio)) {
      console.error("❌ El cuerpo de la solicitud no es un array.");
      return res.status(400).json({
        error: "Invalid request format. Expected an array of positions.",
      });
    }
    console.log(
      "✅ El cuerpo de la solicitud es válido (array de posiciones)."
    );

    // 🔹 Agrupar posiciones por mes de `fechaCierre`
    const groupedPositions = {};
    portfolio.forEach((position) => {
      if (position.fechaCierre) {
        const monthKey = moment(position.fechaCierre).format("YYYY-MM"); // 🔹 Agrupamos por "AÑO-MES"
        if (!groupedPositions[monthKey]) {
          groupedPositions[monthKey] = [];
        }
        groupedPositions[monthKey].push(position);
      }
    });

    console.log(
      "🔹 Posiciones agrupadas por mes:",
      JSON.stringify(groupedPositions, null, 2)
    );

    const groupedResults = {};
    let totalAggregatedState = {
      precioMercado: 0,
      precioPromedio: 0,
      porcentajeAsignacionActiva: 0,
      rentabilidadActual: 0,
      rentabilidadAcumuladaTomas: 0,
      rentabilidadTotalActiva: 0,
      rentabilidadTotalCerrada: 1, // 🔹 Inicializado en 1 para cálculo multiplicativo
      count: 0,
      totalActivePositions: 0,
    };

    for (const monthKey in groupedPositions) {
      const positionsInMonth = groupedPositions[monthKey];
      console.log(`🔄 Procesando posiciones para el mes: ${monthKey}`);

      let consolidatedHistory = [];
      let aggregatedState = {
        precioMercado: 0,
        precioPromedio: 0,
        porcentajeAsignacionActiva: 0,
        rentabilidadActual: 0,
        rentabilidadAcumuladaTomas: 0,
        rentabilidadTotalActiva: 0,
        rentabilidadTotalCerrada: 0,
      };

      for (const position of positionsInMonth) {
        console.log(`⏳ Procesando posición: ${position.symbol}`);
        const posicion = new PositionManager(
          position.precioEntrada,
          position.tipoPosicion
        );

        for (const transaccion of position.transacciones) {
          console.log(
            `  - Procesando transacción: ${transaccion.tipo}, porcentaje: ${transaccion.porcentaje}, precio: ${transaccion.precio}`
          );
          if (transaccion.tipo === "adicion") {
            posicion.adicionar(transaccion.porcentaje, transaccion.precio);
          } else if (transaccion.tipo === "toma_parcial") {
            posicion.tomaParcial(transaccion.porcentaje, transaccion.precio);
          } else if (transaccion.tipo === "cierre_total") {
            const cierreHistorial = posicion.cerrarTotal(transaccion.precio);
            consolidatedHistory.push(...cierreHistorial);

            // 🔹 Acumular la rentabilidad cerrada mensual
            const rentabilidadCierre = cierreHistorial.find(
              (item) => item.tipo === "cierre_total"
            )?.rentabilidadTotal;
            if (rentabilidadCierre) {
              aggregatedState.rentabilidadTotalCerrada +=
                parseFloat(rentabilidadCierre);
              console.log(
                `    🔹 Rentabilidad total de cierre para ${position.symbol}: ${rentabilidadCierre}%`
              );
            }
          }
        }

        const resultado = await posicion.mostrarEstado(position.symbol);
        consolidatedHistory.push(...posicion.historial);

        console.log(
          `    📊 Estado de posición ${position.symbol}:`,
          JSON.stringify(resultado, null, 2)
        );

        // 🔹 Acumular valores para obtener promedios
        aggregatedState.precioMercado += parseFloat(resultado.precioMercado);
        aggregatedState.precioPromedio += parseFloat(resultado.precioPromedio);
        aggregatedState.porcentajeAsignacionActiva += parseFloat(
          resultado.porcentajeAsignacionActiva
        );
        aggregatedState.rentabilidadActual += parseFloat(
          resultado.rentabilidadActual
        );
        aggregatedState.rentabilidadAcumuladaTomas += parseFloat(
          resultado.rentabilidadAcumuladaTomas
        );

        // 🔹 Acumular Rentabilidad Total Activa correctamente
        totalAggregatedState.rentabilidadTotalActiva += parseFloat(
          resultado.rentabilidadTotalActiva
        );
        totalAggregatedState.totalActivePositions += 1;
      }

      console.log(
        `  📅 Rentabilidad del mes ${monthKey}:`,
        JSON.stringify(aggregatedState, null, 2)
      );

      groupedResults[monthKey] = {
        historial: consolidatedHistory,
        estadoActual: aggregatedState,
      };

      // 🔹 Aplicar la fórmula para calcular la rentabilidad cerrada total
      totalAggregatedState.rentabilidadTotalCerrada *=
        1 + aggregatedState.rentabilidadTotalCerrada / 100;
    }

    // 🔹 Ajustar la rentabilidad total activa dividiéndola por el total de posiciones activas
    if (totalAggregatedState.totalActivePositions > 0) {
      totalAggregatedState.rentabilidadTotalActiva = (
        totalAggregatedState.rentabilidadTotalActiva /
        totalAggregatedState.totalActivePositions
      ).toFixed(2);
    }

    // 🔹 Aplicar la fórmula final para Rentabilidad Total Cerrada
    totalAggregatedState.rentabilidadTotalCerrada = (
      (totalAggregatedState.rentabilidadTotalCerrada - 1) *
      100
    ).toFixed(2);

    console.log("✅ Rentabilidad del portafolio calculada con éxito.");
    console.log("📊 Estado General del Portafolio:", totalAggregatedState);

    res.json({
      groupedResults,
      estadoGeneral: totalAggregatedState,
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
