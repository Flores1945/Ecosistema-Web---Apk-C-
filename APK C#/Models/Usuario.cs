namespace MiAppAsistencia.Models
{
    public class Usuario
    {
        public int Id { get; set; }
        public string Correo { get; set; } = string.Empty;
        public string Contrasena { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string Rol { get; set; } = string.Empty; // Admin, Profesor, etc.

        // Sesión de Firebase Auth (la usa DataService para hablar con Firestore)
        public string? IdToken { get; set; }
        public string? RefreshToken { get; set; }
        public string? LocalId { get; set; }
        public DateTime TokenExpiraEn { get; set; }
    }
}
