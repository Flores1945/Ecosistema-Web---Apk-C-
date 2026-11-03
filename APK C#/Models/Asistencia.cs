namespace MiAppAsistencia.Models
{
    public class Asistencia
    {
        public int Id { get; set; }
        public int EstudianteId { get; set; }
        public DateTime Fecha { get; set; }
        public string Estado { get; set; } = string.Empty; // Presente, Ausente, Tarde
        public string MetodoRegistro { get; set; } = string.Empty; // Manual, QR
        public string Observaciones { get; set; } = string.Empty;

        // Propiedad de navegación
        public Estudiante? Estudiante { get; set; }
    }
}
