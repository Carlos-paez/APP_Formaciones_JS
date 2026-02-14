const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const Database = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Inicializar base de datos
const db = new Database();

// Rutas API
app.get("/api/events", async (req, res) => {
  try {
    const events = await db.getEvents();
    res.json(events);
  } catch (error) {
    console.error("Error obteniendo eventos:", error);
    res.status(500).json({ error: "Error al obtener eventos" });
  }
});

app.post("/api/events", async (req, res) => {
  try {
    const { ubicacion, formador, hora_inicio, hora_fin } = req.body;

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
      hora_fin,
    );
    res.json(result);
  } catch (error) {
    console.error("Error guardando evento:", error);
    res.status(500).json({
      success: false,
      message: "Error al guardar el evento",
    });
  }
});

app.delete("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID de evento inválido",
      });
    }

    const eventId = parseInt(id);

    // Verificar si el evento existe
    const event = await db.getEventById(eventId);
    if (!event) {
      // Obtener todos los IDs para diagnóstico
      const allEvents = await db.getEvents();
      const availableIds = allEvents.map((e) => e.id);

      return res.status(404).json({
        success: false,
        message: `Evento no encontrado con ID: ${eventId}`,
        available_ids: availableIds,
        total_events: allEvents.length,
      });
    }

    const result = await db.deleteEvent(eventId);
    res.json(result);
  } catch (error) {
    console.error("Error eliminando evento:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar el evento",
      error: error.message,
    });
  }
});

app.get("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const event = await db.getEventById(parseInt(id));

    if (!event) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    res.json(event);
  } catch (error) {
    console.error("Error obteniendo evento:", error);
    res.status(500).json({ error: "Error al obtener el evento" });
  }
});

// Endpoint para verificar alertas
app.get("/api/alerts/check", async (req, res) => {
  try {
    const events = await db.getEvents();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const alerts = [];

    for (const event of events) {
      const [endHour, endMinute] = event.hora_fin.split(":").map(Number);
      const endTime = endHour * 60 + endMinute;

      // Verificar si el evento acaba de finalizar
      if (currentTime >= endTime && currentTime <= endTime + 1) {
        alerts.push({
          type: "finished",
          event: event,
          message: `🔔 ¡EVENTO FINALIZADO!\n\nEl evento en ${event.ubicacion} con el formador ${event.formador} ha concluido.\n\n⚠️ ES NECESARIO RECONFIGURAR LOS EQUIPOS PRESTADOS.`,
        });
        continue;
      }

      // Verificar alertas de advertencia (10 y 5 minutos antes)
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

    res.json({
      alerts: alerts,
      current_time: `${currentHour}:${currentMinute.toString().padStart(2, "0")}`,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error verificando alertas:", error);
    res.status(500).json({ alerts: [], error: error.message });
  }
});

// Rutas para archivos estáticos
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/register.html", (req, res) => {
  res.sendFile(path.join(__dirname, "register.html"));
});

app.get("/events.html", (req, res) => {
  res.sendFile(path.join(__dirname, "events.html"));
});

app.get("/debug_database.html", (req, res) => {
  res.sendFile(path.join(__dirname, "debug_database.html"));
});

// Ruta catch-all para otros archivos estáticos
app.get("*", (req, res) => {
  const filePath = path.join(__dirname, req.path);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send("Archivo no encontrado");
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║                                                           ║");
  console.log("║  🚀 SERVIDOR DE GESTIÓN DE EVENTOS INICIADO              ║");
  console.log("║                                                           ║");
  console.log(`║  📡 Servidor corriendo en: http://localhost:${PORT}      ║`);
  console.log("║  📁 Directorio base:", __dirname.padEnd(40), "║");
  console.log("║  🗄️  Base de datos: events.db                            ║");
  console.log("║                                                           ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("\n📝 Endpoints disponibles:");
  console.log("   GET    /api/events              - Obtener todos los eventos");
  console.log("   POST   /api/events              - Crear nuevo evento");
  console.log("   GET    /api/events/:id          - Obtener evento por ID");
  console.log("   DELETE /api/events/:id          - Eliminar evento");
  console.log("   GET    /api/alerts/check        - Verificar alertas");
  console.log("\n📄 Páginas:");
  console.log("   /              - Página principal");
  console.log("   /register.html - Registro de eventos");
  console.log("   /events.html   - Visualización de eventos");
  console.log("\n✅ Presiona CTRL+C para detener el servidor\n");
});
