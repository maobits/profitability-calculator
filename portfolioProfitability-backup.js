const express = require("express");
const PositionManager = require("./positionManager"); // Asegúrate de que el archivo positionManager.js tenga la clase PositionManager
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
      return res
        .status(400)
        .json({
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
      rentabilidadTotalCerrada: 1, // 🔹 Nueva propiedad
      count: 0, // Para llevar la cuenta de cuántos ciclos hubo
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
        rentabilidadTotalCerrada: 0, // 🔹 Nueva propiedad
      };

      for (const position of positionsInMonth) {
        console.log(
          `⏳ Procesando posición ID: ${position.id}, símbolo: ${position.symbol}`
        );
        const posicion = new PositionManager(
          position.precioEntrada,
          position.tipoPosicion
        );

        for (const transaccion of position.transacciones) {
          console.log(
            `  - Procesando transacción tipo: ${transaccion.tipo}, porcentaje: ${transaccion.porcentaje}, precio: ${transaccion.precio}`
          );
          if (transaccion.tipo === "adicion") {
            posicion.adicionar(transaccion.porcentaje, transaccion.precio);
          } else if (transaccion.tipo === "toma_parcial") {
            posicion.tomaParcial(transaccion.porcentaje, transaccion.precio);
          } else if (transaccion.tipo === "cierre_total") {
            const cierreHistorial = posicion.cerrarTotal(transaccion.precio);
            consolidatedHistory.push(...cierreHistorial);

            // 🔹 Sumar la rentabilidad total de posiciones cerradas
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
        aggregatedState.rentabilidadTotalActiva += parseFloat(
          resultado.rentabilidadTotalActiva
        );
      }

      // 🔹 Calcular promedios
      const portfolioSize = positionsInMonth.length || 1;
      Object.keys(aggregatedState).forEach((key) => {
        aggregatedState[key] = (aggregatedState[key] / portfolioSize).toFixed(
          2
        );
      });

      console.log(
        `  📅 Rentabilidad del mes ${monthKey}:`,
        JSON.stringify(aggregatedState, null, 2)
      );

      groupedResults[monthKey] = {
        historial: consolidatedHistory,
        estadoActual: aggregatedState,
      };

      // 🔹 Acumular para el estado general
      totalAggregatedState.precioMercado += parseFloat(
        aggregatedState.precioMercado
      );
      totalAggregatedState.precioPromedio += parseFloat(
        aggregatedState.precioPromedio
      );
      totalAggregatedState.porcentajeAsignacionActiva += parseFloat(
        aggregatedState.porcentajeAsignacionActiva
      );
      totalAggregatedState.rentabilidadActual += parseFloat(
        aggregatedState.rentabilidadActual
      );
      totalAggregatedState.rentabilidadAcumuladaTomas += parseFloat(
        aggregatedState.rentabilidadAcumuladaTomas
      );
      totalAggregatedState.rentabilidadTotalActiva += parseFloat(
        aggregatedState.rentabilidadTotalActiva
      );
      totalAggregatedState.rentabilidadTotalCerrada *=
        1 + parseFloat(aggregatedState.rentabilidadTotalCerrada) / 100;
      totalAggregatedState.count += 1;
    }

    // 🔹 Calcular el estado general (promedio de todos los ciclos)
    if (totalAggregatedState.count > 0) {
      Object.keys(totalAggregatedState).forEach((key) => {
        if (key !== "rentabilidadTotalCerrada" && key !== "count") {
          totalAggregatedState[key] = (
            totalAggregatedState[key] / totalAggregatedState.count
          ).toFixed(2);
        }
      });
      totalAggregatedState.rentabilidadTotalCerrada = (
        (totalAggregatedState.rentabilidadTotalCerrada - 1) *
        100
      ).toFixed(2);
    }

    console.log("✅ Rentabilidad del portafolio calculada con éxito.");
    console.log("📊 Estado General del Portafolio:");
    console.table({
      "Precio Mercado": totalAggregatedState.precioMercado,
      "Precio Promedio": totalAggregatedState.precioPromedio,
      "Porcentaje Asignación Activa":
        totalAggregatedState.porcentajeAsignacionActiva,
      "Rentabilidad Actual": totalAggregatedState.rentabilidadActual,
      "Rentabilidad Acumulada Tomas":
        totalAggregatedState.rentabilidadAcumuladaTomas,
      "Rentabilidad Total Activa": totalAggregatedState.rentabilidadTotalActiva,
      "Rentabilidad Total Cerrada":
        totalAggregatedState.rentabilidadTotalCerrada,
    });

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
