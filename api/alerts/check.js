const Database = require("../../database");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const db = new Database();
    await db.ready();
    const events = await db.getEvents();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const alerts = [];

    for (const event of events) {
      const [endHour, endMinute] = event.hora_fin.split(":").map(Number);
      const endTime = endHour * 60 + endMinute;

      if (currentTime >= endTime && currentTime <= endTime + 1) {
        alerts.push({
          type: "finished",
          event: event,
          message: `🔔 ¡EVENTO FINALIZADO!\n\nEl evento en ${event.ubicacion} con el formador ${event.formador} ha concluido.\n\n⚠️ ES NECESARIO RECONFIGURAR LOS EQUIPOS PRESTADOS.`,
        });
        continue;
      }

      const warningPoints = [10, 5];
      for (const minutesBefore of warningPoints) {
        let warningTime = endTime - minutesBefore;
        if (warningTime < 0) warningTime += 24 * 60;
        if (currentTime >= warningTime && currentTime <= warningTime + 1) {
          alerts.push({
            type: "warning",
            event: event,
            minutes_remaining: minutesBefore,
            message: `⏰ ¡ATENCIÓN!\n\nEl evento en ${event.ubicacion} con el formador ${event.formador} finaliza en ${minutesBefore} minutos.\n\nHora de finalización: ${event.hora_fin}`,
          });
          break;
        }
      }
    }

    res.status(200).json({
      alerts: alerts,
      current_time: `${currentHour}:${currentMinute.toString().padStart(2, "0")}`,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error verificando alertas:", error);
    res.status(500).json({ alerts: [], error: error.message });
  }
};
