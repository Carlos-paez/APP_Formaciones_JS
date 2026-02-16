const Database = require("../../database");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const id = req.query.id;
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      success: false,
      message: "ID de evento inválido",
    });
  }
  const eventId = parseInt(id);
  const db = new Database();
  await db.ready();

  if (req.method === "GET") {
    try {
      const event = await db.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ error: "Evento no encontrado" });
      }
      res.status(200).json(event);
    } catch (error) {
      console.error("Error obteniendo evento:", error);
      res.status(500).json({ error: "Error al obtener el evento" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const event = await db.getEventById(eventId);
      if (!event) {
        const allEvents = await db.getEvents();
        return res.status(404).json({
          success: false,
          message: `Evento no encontrado con ID: ${eventId}`,
          available_ids: allEvents.map((e) => e.id),
          total_events: allEvents.length,
        });
      }
      const result = await db.deleteEvent(eventId);
      res.status(200).json(result);
    } catch (error) {
      console.error("Error eliminando evento:", error);
      res.status(500).json({
        success: false,
        message: "Error al eliminar el evento",
        error: error.message,
      });
    }
    return;
  }

  res.setHeader("Allow", "GET, DELETE, OPTIONS");
  res.status(405).json({ error: "Método no permitido" });
};
