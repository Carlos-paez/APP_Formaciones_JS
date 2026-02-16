const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const os = require("os");

// En Vercel el sistema de archivos es de solo lectura excepto /tmp
const isVercel = process.env.VERCEL === "1";
const dbDir = isVercel ? os.tmpdir() : __dirname;

class Database {
  constructor() {
    this.dbPath = path.join(dbDir, "events.db");
    this._ready = new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error("❌ Error al abrir la base de datos:", err.message);
          reject(err);
          return;
        }
        this.db.run("PRAGMA journal_mode=WAL");
        this.db.run("PRAGMA foreign_keys=ON");
        const sql = `
          CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ubicacion TEXT NOT NULL,
            formador TEXT NOT NULL,
            hora_inicio TEXT NOT NULL,
            hora_fin TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        this.db.run(sql, (err2) => {
          if (err2) {
            reject(err2);
            return;
          }
          this.db.run("CREATE INDEX IF NOT EXISTS idx_hora_fin ON events(hora_fin)");
          this.db.run("CREATE INDEX IF NOT EXISTS idx_created ON events(created_at)");
          resolve();
        });
      });
    });
  }

  async ready() {
    return this._ready;
  }

  createTable() {
    // Mantenido por compatibilidad; la creación real ocurre en constructor
  }

  saveEvent(ubicacion, formador, hora_inicio, hora_fin) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO events (ubicacion, formador, hora_inicio, hora_fin) 
                        VALUES (?, ?, ?, ?)`;

      this.db.run(
        sql,
        [ubicacion, formador, hora_inicio, hora_fin],
        function (err) {
          if (err) {
            console.error("❌ Error guardando evento:", err.message);
            reject({ success: false, message: "Error al guardar el evento" });
            return;
          }

          console.log(`✅ Evento guardado con ID: ${this.lastID}`);
          resolve({
            success: true,
            message: "Evento guardado correctamente",
            id: this.lastID,
          });
        },
      );
    });
  }

  getEvents() {
    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM events ORDER BY created_at DESC";

      this.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error("❌ Error obteniendo eventos:", err.message);
          reject(err);
          return;
        }

        console.log(`📊 Obtenidos ${rows.length} eventos`);
        resolve(rows);
      });
    });
  }

  getEventById(id) {
    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM events WHERE id = ?";

      this.db.get(sql, [id], (err, row) => {
        if (err) {
          console.error("❌ Error obteniendo evento por ID:", err.message);
          reject(err);
          return;
        }

        if (row) {
          console.log(`✅ Evento encontrado con ID: ${id}`);
        } else {
          console.log(`❌ Evento NO encontrado con ID: ${id}`);
        }

        resolve(row);
      });
    });
  }

  deleteEvent(id) {
    return new Promise(async (resolve, reject) => {
      try {
        // Guardar referencia a la instancia de Database
        const dbInstance = this;

        // Verificar si el evento existe
        const event = await this.getEventById(id);
        if (!event) {
          reject({
            success: false,
            message: `Evento no encontrado con ID: ${id}`,
          });
          return;
        }

        console.log(`🗑️ Eliminando evento ID: ${id} - ${event.ubicacion}`);

        const sql = "DELETE FROM events WHERE id = ?";

        // Usar arrow function para mantener el contexto correcto
        this.db.run(sql, [id], function (err) {
          if (err) {
            console.error("❌ Error eliminando evento:", err.message);
            reject({
              success: false,
              message: "Error al eliminar el evento",
              error: err.message,
            });
            return;
          }

          const changes = this.changes; // this aquí es el Statement de SQLite
          console.log(
            `✅✅ Evento eliminado correctamente. Filas afectadas: ${changes}`,
          );

          // Verificar que realmente se eliminó - usar dbInstance para acceder a this.db
          dbInstance.db.get(
            "SELECT COUNT(*) as count FROM events WHERE id = ?",
            [id],
            (err, row) => {
              if (err) {
                console.error("❌ Error verificando eliminación:", err.message);
              }

              if (!err && row && row.count === 0) {
                console.log(
                  `✅ Verificación exitosa: Evento ID ${id} ya no existe`,
                );
              } else {
                console.log(
                  `⚠️ Advertencia: El evento ID ${id} podría no haberse eliminado completamente`,
                );
              }

              resolve({
                success: true,
                message: `Evento '${event.ubicacion}' eliminado correctamente`,
                deleted_id: id,
                rows_affected: changes,
              });
            },
          );
        });
      } catch (error) {
        console.error("❌ Error en deleteEvent:", error);
        reject({
          success: false,
          message: error.message || "Error al eliminar el evento",
        });
      }
    });
  }

  countEvents() {
    return new Promise((resolve, reject) => {
      const sql = "SELECT COUNT(*) as count FROM events";

      this.db.get(sql, [], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row.count);
      });
    });
  }

  close() {
    this.db.close((err) => {
      if (err) {
        console.error("❌ Error cerrando base de datos:", err.message);
        return;
      }
      console.log("✅ Base de datos cerrada");
    });
  }
}

module.exports = Database;
