using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MiAppAsistencia.Models;

namespace MiAppAsistencia.Services
{
    /// <summary>
    /// Autenticación con Firebase Authentication mediante su API REST
    /// (identitytoolkit). Funciona desde cualquier red, sin depender
    /// de que el backend Node.js esté encendido.
    /// </summary>
    public class FirebaseAuthService
    {
        // Proyecto Firebase: apk-asistencia-7be25
        // La apiKey es pública (identifica el proyecto); la seguridad la da la contraseña.
        private const string ApiKey = "AIzaSyAxVHP1-7rtzB-4V2AhXb4wKNIw-0N3f8E";
        private const string SignInUrl =
            $"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={ApiKey}";

        private readonly HttpClient _httpClient;

        public FirebaseAuthService()
        {
            _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
        }

        public async Task<FirebaseAuthResult?> IniciarSesionAsync(string correo, string contrasena)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync(SignInUrl, new
                {
                    email = correo.Trim(),
                    password = contrasena,
                    returnSecureToken = true
                });

                var json = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    var error = JsonSerializer.Deserialize<FirebaseErrorResponse>(json);
                    var motivo = error?.Error?.Message ?? "Credenciales incorrectas.";
                    Console.WriteLine($"Firebase Auth error: {motivo}");
                    return null;
                }

                var data = JsonSerializer.Deserialize<FirebaseAuthResponse>(json);
                if (data?.IdToken is null)
                    return null;

                return new FirebaseAuthResult
                {
                    IdToken = data.IdToken,
                    RefreshToken = data.RefreshToken ?? string.Empty,
                    LocalId = data.LocalId ?? string.Empty,
                    Correo = data.Email ?? correo.Trim(),
                    Nombre = string.IsNullOrWhiteSpace(data.DisplayName)
                        ? correo.Trim().Split('@')[0]
                        : data.DisplayName!,
                    ExpiraEnSegundos = int.TryParse(data.ExpiresIn, out var s) ? s : 3600
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error de conexión con Firebase Auth: {ex.Message}");
                return null;
            }
        }

        // Renueva el idToken usando el refreshToken guardado.
        // La URL de refresh no lleva API key en la query; va en el body.
        public async Task<string?> RenovarTokenAsync(string refreshToken)
        {
            try
            {
                var response = await _httpClient.PostAsync(
                    "https://securetoken.googleapis.com/v1/token?key=" + ApiKey,
                    new FormUrlEncodedContent(new Dictionary<string, string>
                    {
                        ["grant_type"] = "refresh_token",
                        ["refresh_token"] = refreshToken
                    })
                );

                if (!response.IsSuccessStatusCode)
                    return null;

                var data = await response.Content.ReadFromJsonAsync<JsonElement>();
                return data.TryGetProperty("id_token", out var t) ? t.GetString() : null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error renovando token: {ex.Message}");
                return null;
            }
        }
    }

    public class FirebaseAuthResult
    {
        public string IdToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public string LocalId { get; set; } = string.Empty;
        public string Correo { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public int ExpiraEnSegundos { get; set; }

        public Usuario ToUsuario()
        {
            var usuario = new Usuario
            {
                // No hay id entero de MySQL en Firebase; se usa 0 y el uid real va en LocalId.
                Id = 0,
                Correo = Correo,
                Nombre = Nombre,
                Rol = "Usuario",
                IdToken = IdToken,
                RefreshToken = RefreshToken,
                LocalId = LocalId,
                TokenExpiraEn = DateTime.Now.AddSeconds(ExpiraEnSegundos)
            };

            SesionFirebase.Establecer(usuario);
            return usuario;
        }
    }

    internal class FirebaseAuthResponse
    {
        [JsonPropertyName("idToken")] public string? IdToken { get; set; }
        [JsonPropertyName("refreshToken")] public string? RefreshToken { get; set; }
        [JsonPropertyName("localId")] public string? LocalId { get; set; }
        [JsonPropertyName("email")] public string? Email { get; set; }
        [JsonPropertyName("displayName")] public string? DisplayName { get; set; }
        [JsonPropertyName("expiresIn")] public string? ExpiresIn { get; set; }
    }

    internal class FirebaseErrorResponse
    {
        [JsonPropertyName("error")] public FirebaseErrorDetail? Error { get; set; }
    }

    internal class FirebaseErrorDetail
    {
        [JsonPropertyName("message")] public string? Message { get; set; }
    }
}
