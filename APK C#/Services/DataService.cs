using System.Text.Json;
using MiAppAsistencia.Models;

namespace MiAppAsistencia.Services
{
    public class DataService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiBaseUrl = "http://192.168.100.8:3000/api/public";

        private static List<Usuario> _usuarios = new List<Usuario>
        {
            new Usuario { Id = 1, Correo = "admin@liceo.edu", Contrasena = "admin123", Nombre = "Administrador", Rol = "Admin" },
            new Usuario { Id = 2, Correo = "profesor@liceo.edu", Contrasena = "profesor123", Nombre = "Profesor Juan", Rol = "Profesor" }
        };

        private static List<Asistencia> _asistencias = new List<Asistencia>();

        public DataService()
        {
            _httpClient = new HttpClient();
        }

        // Métodos para Usuarios
        public Usuario? ValidarUsuario(string correo, string contrasena)
        {
            return _usuarios.FirstOrDefault(u => u.Correo == correo && u.Contrasena == contrasena);
        }

        // Métodos para Estudiantes (con conexión a API)
        public async Task<List<Estudiante>> ObtenerTodosEstudiantes()
        {
            var estudiantes = new List<Estudiante>();

            try
            {
                var response = await _httpClient.GetAsync($"{_apiBaseUrl}/estudiantes");
                response.EnsureSuccessStatusCode();
                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<List<JsonElement>>(json);

                if (data != null)
                {
                    foreach (var item in data)
                    {
                        var nivelStr = item.TryGetProperty("nivel", out var nivelVal) ? nivelVal.GetString() ?? "" : "";
                        var gradoVal = item.TryGetProperty("grado", out var grado) ? grado.GetInt32() : 0;
                        var seccionStr = item.TryGetProperty("seccion", out var seccion) ? seccion.GetString() ?? "" : "";
                        
                        estudiantes.Add(new Estudiante
                        {
                            Id = item.GetProperty("id").GetInt32(),
                            Nombre = item.TryGetProperty("nombres", out var nombre) ? nombre.GetString() ?? "" : "",
                            Apellido = item.TryGetProperty("apellidos", out var apellido) ? apellido.GetString() ?? "" : "",
                            Nivel = nivelStr,
                            Grado = gradoVal,
                            Seccion = seccionStr,
                            Turno = item.TryGetProperty("turno", out var turno) ? turno.GetString() ?? "" : "",
                            Aula = $"{nivelStr?[0]}{gradoVal}{seccionStr}",
                            CodigoQR = item.TryGetProperty("dni", out var dni) ? dni.GetString() ?? "" : ""
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener estudiantes: {ex.Message}");
            }

            return estudiantes;
        }

        public async Task<Estudiante?> ObtenerEstudiantePorId(int id)
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_apiBaseUrl}/estudiantes");
                response.EnsureSuccessStatusCode();
                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<List<JsonElement>>(json);

                if (data != null)
                {
                    var estudiante = data.FirstOrDefault(e => e.TryGetProperty("id", out var idVal) && idVal.GetInt32() == id);
                    if (estudiante.ValueKind != JsonValueKind.Undefined)
                    {
                        return new Estudiante
                        {
                            Id = estudiante.GetProperty("id").GetInt32(),
                            Nombre = estudiante.GetProperty("nombres").GetString() ?? "",
                            Apellido = estudiante.GetProperty("apellidos").GetString() ?? "",
                            Nivel = estudiante.GetProperty("nivel").GetString() ?? "",
                            Grado = estudiante.GetProperty("grado").GetInt32(),
                            Seccion = estudiante.GetProperty("seccion").GetString() ?? "",
                            Turno = estudiante.GetProperty("turno").GetString() ?? "",
                            Aula = $"{estudiante.GetProperty("nivel").GetString()?[0]}{estudiante.GetProperty("grado").GetInt32()}{estudiante.GetProperty("seccion").GetString()}",
                            CodigoQR = estudiante.GetProperty("dni").GetString() ?? ""
                        };
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener estudiante: {ex.Message}");
            }

            return null;
        }

        public async Task<Estudiante?> ObtenerEstudiantePorCodigoQR(string codigoQR)
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_apiBaseUrl}/estudiantes/{codigoQR}");
                
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return null;
                }
                
                response.EnsureSuccessStatusCode();
                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(json);

                return new Estudiante
                {
                    Id = data.GetProperty("id").GetInt32(),
                    Nombre = data.GetProperty("nombres").GetString() ?? "",
                    Apellido = data.GetProperty("apellidos").GetString() ?? "",
                    Nivel = data.GetProperty("nivel").GetString() ?? "",
                    Grado = data.GetProperty("grado").GetInt32(),
                    Seccion = data.GetProperty("seccion").GetString() ?? "",
                    Turno = data.GetProperty("turno").GetString() ?? "",
                    Aula = $"{data.GetProperty("nivel").GetString()?[0]}{data.GetProperty("grado").GetInt32()}{data.GetProperty("seccion").GetString()}",
                    CodigoQR = data.GetProperty("dni").GetString() ?? ""
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al buscar estudiante por QR: {ex.Message}");
            }

            return null;
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
            {
                query = query.Where(e => e.Aula == aula);
            }

            if (!string.IsNullOrWhiteSpace(seccion))
            {
                query = query.Where(e => e.Seccion == seccion);
            }

            if (!string.IsNullOrWhiteSpace(grado) && int.TryParse(grado, out int gradoNum))
            {
                query = query.Where(e => e.Grado == gradoNum);
            }

            if (!string.IsNullOrWhiteSpace(nivel))
            {
                query = query.Where(e => e.Nivel == nivel);
            }

            if (!string.IsNullOrWhiteSpace(turno))
            {
                query = query.Where(e => e.Turno == turno);
            }

            return query.ToList();
        }

        // Métodos para Asistencia
        public async Task RegistrarAsistencia(Asistencia asistencia)
        {
            _asistencias.Add(asistencia);

            // También guardar en API
            try
            {
                var payload = new
                {
                    estudiante_id = asistencia.EstudianteId,
                    estado = asistencia.Estado,
                    observacion = asistencia.Observaciones
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync($"{_apiBaseUrl}/asistencia", content);
                response.EnsureSuccessStatusCode();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al guardar asistencia en API: {ex.Message}");
            }
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
            return _asistencias.Any(a => a.EstudianteId == estudianteId && a.Fecha.Date == DateTime.Today);
        }
    }
}
