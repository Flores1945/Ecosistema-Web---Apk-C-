namespace MiAppAsistencia.Models
{
    public class Estudiante
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
        public string Nivel { get; set; } = string.Empty; // Primaria o Secundaria
        public int Grado { get; set; }
        public string Seccion { get; set; } = string.Empty;
        public string Turno { get; set; } = string.Empty; // Mañana o Tarde
        public string Aula { get; set; } = string.Empty;
        public string CodigoQR { get; set; } = string.Empty; // Código único para QR (DNI)
    }
}
