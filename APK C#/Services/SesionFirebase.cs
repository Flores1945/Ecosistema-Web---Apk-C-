using MiAppAsistencia.Models;

namespace MiAppAsistencia.Services
{
    /// <summary>
    /// Guarda la sesión de Firebase del usuario logueado y entrega un
    /// idToken vigente (lo renueva solo cuando está por expirar).
    /// Lo usan los servicios que llaman a Firestore REST.
    /// </summary>
    public static class SesionFirebase
    {
        private static readonly object _lock = new();
        private static Usuario? _usuario;
        private static readonly FirebaseAuthService _auth = new();

        public static string? Correo => _usuario?.Correo;

        public static void Establecer(Usuario usuario)
        {
            lock (_lock) _usuario = usuario;
        }

        public static void Limpiar()
        {
            lock (_lock) _usuario = null;
        }

        /// <summary>Devuelve un idToken válido; lo renueva si faltan menos de 60 s.</summary>
        public static async Task<string?> ObtenerTokenAsync()
        {
            Usuario? u;
            lock (_lock) u = _usuario;
            if (u is null) return null;

            if (u.TokenExpiraEn > DateTime.Now.AddSeconds(60) && !string.IsNullOrEmpty(u.IdToken))
                return u.IdToken;

            if (string.IsNullOrEmpty(u.RefreshToken)) return u.IdToken;

            var nuevo = await _auth.RenovarTokenAsync(u.RefreshToken);
            if (nuevo is null) return u.IdToken; // si falla la renovación, probamos con el viejo

            lock (_lock)
            {
                u.IdToken = nuevo;
                u.TokenExpiraEn = DateTime.Now.AddSeconds(3600);
            }
            return nuevo;
        }
    }
}
