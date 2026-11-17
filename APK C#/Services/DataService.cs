using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MiAppAsistencia.Models;

namespace MiAppAsistencia.Services
{
    /// <summary>
    /// Datos de la app contra el backend Node.js local (misma red WiFi del colegio).
    /// La APK se autentica con el idToken de Firebase; el backend lo verifica
    /// con Firebase Admin y lee/escribe MySQL directamente.
    /// </summary>
    public class DataService
    {
        // PC del backend en la red local del colegio
        private const string BaseUrl = "http://192.168.1.37:3000/api/apk";

        private readonly HttpClient _httpClient;
        private readonly List<Asistencia> _asistencias = new();
        private readonly HashSet<int> _registradosHoy = new();
        private string _fechaCargada = "";
        private List<Estudiante>? _cacheEstudiantes;
        private DateTime _cacheEstudiantesFecha = DateTime.MinValue;
        public string? UltimoError { get; private set; }

        public DataService()
        {
            _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
        }

        private async Task<HttpRequestMessage> CrearRequestAsync(HttpMethod metodo, string url, object? body = null)
        {
            var request = new HttpRequestMessage(metodo, url);
            var token = await SesionFirebase.ObtenerTokenAsync();
            if (!string.IsNullOrEmpty(token))
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            if (body is not null)
                request.Content = JsonContent.Create(body);
            return request;
        }

        private async Task<JsonElement?> GetJsonAsync(string url)
        {
            using var request = await CrearRequestAsync(HttpMethod.Get, url);
            using var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var texto = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Backend GET {url} -> {(int)response.StatusCode}: {texto[..Math.Min(300, texto.Length)]}");
                return null;
            }
            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<JsonElement>(json);
        }

        // ---------- Estudiantes ----------

        private static Estudiante DocAEstudiante(JsonElement doc)
        {
            var nivel = doc.TryGetProperty("nivel", out var n) ? n.GetString() ?? "" : "";
            var grado = doc.TryGetProperty("grado", out var g) && g.TryGetInt32(out var gv) ? gv : 0;
            var seccion = doc.TryGetProperty("seccion", out var s) ? s.GetString() ?? "" : "";
            var id = doc.TryGetProperty("id", out var i) && i.TryGetInt32(out var iv) ? iv : 0;
            var dni = doc.TryGetProperty("dni", out var d) ? d.GetString() : null;

            return new Estudiante
            {
                Id = id,
                Nombre = doc.TryGetProperty("nombres", out var no) ? no.GetString() ?? "" : "",
                Apellido = doc.TryGetProperty("apellidos", out var ap) ? ap.GetString() ?? "" : "",
                Nivel = nivel,
                Grado = grado,
                Seccion = seccion,
                Turno = doc.TryGetProperty("turno", out var t) ? t.GetString() ?? "" : "",
                Aula = $"{(nivel.Length > 0 ? nivel[0].ToString() : "")}{grado}{seccion}",
                CodigoQR = string.IsNullOrWhiteSpace(dni) ? id.ToString() : dni
            };
        }

        public async Task<List<Estudiante>> ObtenerTodosEstudiantes()
        {
            if (_cacheEstudiantes is not null && DateTime.Now - _cacheEstudiantesFecha < TimeSpan.FromMinutes(5))
                return _cacheEstudiantes;

            try
            {
                var data = await GetJsonAsync($"{BaseUrl}/estudiantes");
                var lista = new List<Estudiante>();
                if (data is not null && data.Value.TryGetProperty("estudiantes", out var docs))
                    foreach (var doc in docs.EnumerateArray())
                        lista.Add(DocAEstudiante(doc));

                _cacheEstudiantes = lista;
                _cacheEstudiantesFecha = DateTime.Now;
                UltimoError = null;
                return lista;
            }
            catch (Exception ex)
            {
                UltimoError = ex.Message;
                Console.WriteLine($"Error al obtener estudiantes: {ex}");
                return _cacheEstudiantes ?? new List<Estudiante>();
            }
        }

        public async Task<Estudiante?> ObtenerEstudiantePorId(int id)
        {
            var todos = await ObtenerTodosEstudiantes();
            return todos.FirstOrDefault(e => e.Id == id);
        }

        public async Task<Estudiante?> ObtenerEstudiantePorCodigoQR(string codigoQR)
        {
            try
            {
                var todos = await ObtenerTodosEstudiantes();
                return todos.FirstOrDefault(e =>
                    string.Equals(e.CodigoQR, codigoQR, StringComparison.OrdinalIgnoreCase) ||
                    e.Id.ToString() == codigoQR);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al buscar estudiante por QR: {ex.Message}");
                return null;
            }
        }

        public async Task<List<Estudiante>> BuscarEstudiantes(string? nombre = null, string? aula = null, string? seccion = null, string? grado = null, string? nivel = null, string? turno = null)
        {
            var estudiantes = await ObtenerTodosEstudiantes();
            var query = estudiantes.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(nombre))
            {
                query = query.Where(e => e.Nombre.Contains(nombre, StringComparison.OrdinalIgnoreCase) ||
                                         e.Apellido.Contains(nombre, StringComparison.OrdinalIgnoreCase));
            }
            if (!string.IsNullOrWhiteSpace(aula))
                query = query.Where(e => e.Aula == aula);
            if (!string.IsNullOrWhiteSpace(seccion))
                query = query.Where(e => e.Seccion == seccion);
            if (!string.IsNullOrWhiteSpace(grado) && int.TryParse(grado, out int gradoNum))
                query = query.Where(e => e.Grado == gradoNum);
            if (!string.IsNullOrWhiteSpace(nivel))
                query = query.Where(e => e.Nivel == nivel);
            if (!string.IsNullOrWhiteSpace(turno))
                query = query.Where(e => e.Turno == turno);

            return query.ToList();
        }

        // ---------- Asistencia ----------

        private async Task CargarAsistenciasDelDiaAsync()
        {
            var hoy = DateTime.Today.ToString("yyyy-MM-dd");
            if (_fechaCargada == hoy) return;

            var data = await GetJsonAsync($"{BaseUrl}/asistencias?fecha={hoy}");
            _registradosHoy.Clear();
            _asistencias.RemoveAll(a => a.Fecha.Date == DateTime.Today);

            if (data is not null && data.Value.TryGetProperty("asistencias", out var docs))
                foreach (var doc in docs.EnumerateArray())
                {
                    var id = doc.TryGetProperty("estudiante_id", out var e) && e.TryGetInt32(out var ev) ? ev : 0;
                    if (id == 0) continue;
                    _registradosHoy.Add(id);
                    _asistencias.Add(new Asistencia
                    {
                        EstudianteId = id,
                        Fecha = DateTime.Today,
                        Estado = doc.TryGetProperty("estado", out var est) ? est.GetString() ?? "Presente" : "Presente"
                    });
                }
            _fechaCargada = hoy;
        }

        /// <summary>True si ya existe la asistencia de hoy en el backend.</summary>
        public async Task<bool> YaRegistradoHoyAsync(int estudianteId)
        {
            try
            {
                await CargarAsistenciasDelDiaAsync();
            }
            catch { /* si falla la red, se intenta registrar igual */ }
            return _registradosHoy.Contains(estudianteId);
        }

        /// <summary>Escribe la asistencia en el backend (MySQL). Devuelve false si ya existía hoy.</summary>
        public async Task<bool> RegistrarAsistencia(Asistencia asistencia)
        {
            if (await YaRegistradoHoyAsync(asistencia.EstudianteId))
                return false;

            var body = new
            {
                estudiante_id = asistencia.EstudianteId,
                estado = string.IsNullOrWhiteSpace(asistencia.Estado) ? "Presente" : asistencia.Estado,
                observacion = asistencia.Observaciones,
                fecha = DateTime.Today.ToString("yyyy-MM-dd")
            };

            using var request = await CrearRequestAsync(HttpMethod.Post, $"{BaseUrl}/asistencias", body);
            using var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var texto = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Backend POST asistencia -> {(int)response.StatusCode}: {texto[..Math.Min(300, texto.Length)]}");
                return false;
            }

            asistencia.Id = 0;
            asistencia.Fecha = DateTime.Today;
            _asistencias.Add(asistencia);
            _registradosHoy.Add(asistencia.EstudianteId);
            return true;
        }

        public List<Asistencia> ObtenerAsistenciasPorFecha(DateTime fecha)
        {
            return _asistencias.Where(a => a.Fecha.Date == fecha.Date).ToList();
        }

        public List<Asistencia> ObtenerAsistenciasPorEstudiante(int estudianteId)
        {
            return _asistencias.Where(a => a.EstudianteId == estudianteId).ToList();
        }

        public bool YaRegistradoHoy(int estudianteId)
        {
            return _registradosHoy.Contains(estudianteId);
        }
    }
}
