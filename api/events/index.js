const Database = require("../../database");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const db = new Database();
  await db.ready();

  if (req.method === "GET") {
    try {
      const events = await db.getEvents();
      res.status(200).json(events);
    } catch (error) {
      console.error("Error obteniendo eventos:", error);
      res.status(500).json({ error: "Error al obtener eventos" });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const { ubicacion, formador, hora_inicio, hora_fin } = req.body || {};
      if (!ubicacion || !formador || !hora_inicio || !hora_fin) {
        return res.status(400).json({
          success: false,
          message: "Todos los campos son requeridos",
        });
      }
      const result = await db.saveEvent(
        ubicacion,
        formador,
        hora_inicio,
        hora_fin
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Error guardando evento:", error);
      res.status(500).json({
        success: false,
        message: "Error al guardar el evento",
      });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST, OPTIONS");
  res.status(405).json({ error: "Método no permitido" });
};
