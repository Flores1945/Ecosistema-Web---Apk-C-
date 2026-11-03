namespace MiAppAsistencia.Models
{
    public class Usuario
    {
        public int Id { get; set; }
        public string Correo { get; set; } = string.Empty;
        public string Contrasena { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string Rol { get; set; } = string.Empty; // Admin, Profesor, etc.
    }
}
