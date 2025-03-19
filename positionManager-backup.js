const axios = require("axios");

const API_URL = "https://ttrading.shop:3000/api/yfinance/quote/";
const API_KEY = "12345678-9abc-def0-1234-56789abcdef0";

class PositionManager {
  constructor(precioEntrada, tipoPosicion = "corto") {
    this.precioPromedio = precioEntrada;
    this.unidades = 1;
    this.porcentajeAsignacionActiva = 100;
    this.tipoPosicion = tipoPosicion.toLowerCase();
    this.rentabilidadAcumuladaTomas = 0;
    this.pesoAcumuladoTomas = 0;
    this.historial = [];
  }

  async getMarketPrice(symbol) {
    try {
      const response = await axios.get(`${API_URL}${symbol}`, {
        headers: { "x-api-key": API_KEY },
      });
      return response.data.price;
    } catch (error) {
      console.error(
        `❌ Error al obtener el precio de mercado para ${symbol}:`,
        error.message
      );
      return null;
    }
  }

  async mostrarEstado(symbol) {
    const precioMercado = await this.getMarketPrice(symbol);
    if (!precioMercado)
      return { error: "No se pudo obtener el precio de mercado." };

    const rentabilidadActual =
      this.tipoPosicion === "corto"
        ? ((this.precioPromedio - precioMercado) / this.precioPromedio) * 100
        : ((precioMercado - this.precioPromedio) / this.precioPromedio) * 100;

    const pesoParteActiva = Math.max(0, 1 - this.pesoAcumuladoTomas);
    const rentabilidadTotalActiva =
      isNaN(this.rentabilidadAcumuladaTomas) ||
      isNaN(rentabilidadActual * pesoParteActiva)
        ? 0
        : this.rentabilidadAcumuladaTomas +
          rentabilidadActual * pesoParteActiva;

    // 🔹 Buscar el último cierre total en el historial y extraer su rentabilidad total
    const ultimaCierreTotal = this.historial
      .filter((h) => h.tipo === "cierre_total")
      .pop();

    return {
      precioMercado: precioMercado.toFixed(2),
      precioPromedio: this.precioPromedio.toFixed(2),
      porcentajeAsignacionActiva: this.porcentajeAsignacionActiva.toFixed(2),
      rentabilidadActual: rentabilidadActual.toFixed(2),
      rentabilidadAcumuladaTomas: this.rentabilidadAcumuladaTomas.toFixed(2),
      rentabilidadTotalActiva: rentabilidadTotalActiva.toFixed(2),
      rentabilidadTotal: ultimaCierreTotal
        ? ultimaCierreTotal.rentabilidadTotal
        : "N/A", // ✅ Nuevo campo para facilitar el acceso
    };
  }

  adicionar(porcentajeAdicion, precioAdicion) {
    if (isNaN(porcentajeAdicion) || isNaN(precioAdicion)) {
      console.warn(
        "⚠️ Datos inválidos en `adicionar()`. Se omite la operación."
      );
      return;
    }

    const unidadesAdicionales = this.unidades * porcentajeAdicion;
    this.precioPromedio =
      (this.unidades * this.precioPromedio +
        unidadesAdicionales * precioAdicion) /
      (this.unidades + unidadesAdicionales);
    this.unidades += unidadesAdicionales;
    this.porcentajeAsignacionActiva *= 1 + porcentajeAdicion;

    this.historial.push({
      tipo: "adicion",
      porcentajeAdicion,
      precioAdicion,
      nuevoPrecioPromedio: this.precioPromedio.toFixed(2),
      unidades: this.unidades.toFixed(2),
      porcentajeAsignacionActiva: this.porcentajeAsignacionActiva.toFixed(2),
    });
  }

  tomaParcial(porcentajeToma, precioToma) {
    const unidadesVendidas = this.unidades * porcentajeToma;
    const rentabilidadToma =
      this.tipoPosicion === "corto"
        ? ((this.precioPromedio - precioToma) / this.precioPromedio) * 100
        : ((precioToma - this.precioPromedio) / this.precioPromedio) * 100;

    this.rentabilidadAcumuladaTomas += rentabilidadToma * porcentajeToma;
    this.pesoAcumuladoTomas += porcentajeToma;
    this.unidades -= unidadesVendidas;
    this.porcentajeAsignacionActiva *= 1 - porcentajeToma;

    this.historial.push({
      tipo: "toma_parcial",
      porcentajeToma,
      precioToma,
      rentabilidadToma: rentabilidadToma.toFixed(2),
      unidadesRestantes: this.unidades.toFixed(2),
      porcentajeAsignacionActiva: this.porcentajeAsignacionActiva.toFixed(2),
    });
  }

  cerrarTotal(precioCierre) {
    const rentabilidadCierre =
      this.tipoPosicion === "corto"
        ? ((this.precioPromedio - precioCierre) / this.precioPromedio) * 100
        : ((precioCierre - this.precioPromedio) / this.precioPromedio) * 100;

    const pesoParteActiva = Math.max(0, 1 - this.pesoAcumuladoTomas);
    const rentabilidadTotal =
      isNaN(this.rentabilidadAcumuladaTomas) ||
      isNaN(rentabilidadCierre * pesoParteActiva)
        ? 0
        : this.rentabilidadAcumuladaTomas +
          rentabilidadCierre * pesoParteActiva;

    const cierreData = {
      tipo: "cierre_total",
      precioCierre,
      rentabilidadCierre: rentabilidadCierre.toFixed(2),
      rentabilidadTotal: rentabilidadTotal.toFixed(2),
    };

    this.historial.push(cierreData);
    return this.historial;
  }
}

module.exports = PositionManager;
