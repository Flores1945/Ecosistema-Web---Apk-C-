using System.ComponentModel;
using System.Globalization;
using System.Runtime.CompilerServices;
using MiAppAsistencia.Models;
using MiAppAsistencia.Services;
using MiAppAsistencia.Views;

namespace MiAppAsistencia;

public partial class MainPage : ContentPage
{
    private readonly Usuario _usuario;
    private readonly DataService _dataService;
    private List<EstudianteViewModel> _resultados = [];
    private CancellationTokenSource? _debounceBusqueda;

    public MainPage(Usuario usuario)
    {
        InitializeComponent();
        _usuario = usuario;
        _dataService = new DataService();

        UsuarioNombreLabel.Text = _usuario.Nombre;
        UsuarioRolLabel.Text = _usuario.Rol;
        FechaLabel.Text = FechaDeHoy();

        // Búsqueda simple
        NivelPickerS.SelectedIndexChanged += (s, e) => OnNivelChanged(NivelPickerS, GradoPickerS);
        GradoPickerS.SelectedIndexChanged += (s, e) => ActualizarTurnoInfo(NivelPickerS, GradoPickerS);
        // Búsqueda avanzada
        NivelPickerA.SelectedIndexChanged += (s, e) => OnNivelChanged(NivelPickerA, GradoPickerA);
        GradoPickerA.SelectedIndexChanged += (s, e) =>
        {
            ActualizarTurnoInfo(NivelPickerA, GradoPickerA);
            _ = EjecutarBusquedaAvanzadaAsync();
        };
        SeccionPickerA.SelectedIndexChanged += (s, e) => _ = EjecutarBusquedaAvanzadaAsync();

        // Estado inicial: se cargan todos los estudiantes como muestra;
        // el usuario puede filtrar para acotar la lista.
        _resultados = [];
        EstudiantesCollectionView.ItemsSource = _resultados;
        ResumenLabel.Text = "Cargando estudiantes...";
        ConteoLabel.Text = "0";
        ActualizarIndicadores();

        _ = CargarEstudiantesInicialAsync();
    }

    private async Task CargarEstudiantesInicialAsync()
    {
        LoadingIndicator.IsVisible = true;
        LoadingIndicator.IsRunning = true;

        try
        {
            var estudiantes = await _dataService.ObtenerTodosEstudiantes();

            if (estudiantes.Count == 0)
            {
                var detalle = string.IsNullOrEmpty(_dataService.UltimoError)
                    ? "sin conexión a internet"
                    : _dataService.UltimoError;
                await AplicarResultadosAsync([], $"No se pudieron cargar los estudiantes ({detalle})");
                await DisplayAlertAsync("Error de conexión", $"No se pudieron cargar los estudiantes.\n\n{detalle}", "OK");
                return;
            }

            await AplicarResultadosAsync(estudiantes, $"{estudiantes.Count} estudiantes — filtra para acotar la lista");
        }
        finally
        {
            LoadingIndicator.IsRunning = false;
            LoadingIndicator.IsVisible = false;
        }
    }

    private static string FechaDeHoy()
    {
        var hoy = DateTime.Today.ToString("dddd, d 'de' MMMM 'de' yyyy", new CultureInfo("es-PE"));
        return char.ToUpperInvariant(hoy[0]) + hoy[1..];
    }

    // ---------- Selector de modo ----------

    private void OnModoSimple(object? sender, EventArgs e) => CambiarModo(avanzada: false);
    private void OnModoAvanzada(object? sender, EventArgs e) => CambiarModo(avanzada: true);

    private void CambiarModo(bool avanzada)
    {
        PanelSimple.IsVisible = !avanzada;
        PanelAvanzada.IsVisible = avanzada;
        BtnModoSimple.Style = avanzada
            ? (Style)Resources["OutlineButton"]
            : (Style)Resources["BaseButton"];
        BtnModoAvanzada.Style = avanzada
            ? (Style)Resources["BaseButton"]
            : (Style)Resources["OutlineButton"];
    }

    // ---------- Filtros ----------

    private void OnNivelChanged(Picker nivelPicker, Picker gradoPicker)
    {
        var nivel = nivelPicker.SelectedItem?.ToString();

        gradoPicker.SelectedItem = null;
        gradoPicker.Items.Clear();

        // Primaria llega a 6.°; Secundaria a 5.°
        var ultimoGrado = nivel == "Secundaria" ? 5 : 6;

        for (var grado = 1; grado <= ultimoGrado; grado++)
            gradoPicker.Items.Add(grado.ToString(CultureInfo.InvariantCulture));

        ActualizarTurnoInfo(nivelPicker, gradoPicker);
        if (PanelAvanzada.IsVisible)
            _ = EjecutarBusquedaAvanzadaAsync();
    }

    private void ActualizarTurnoInfo(Picker nivelPicker, Picker gradoPicker)
    {
        var nivel = nivelPicker.SelectedItem?.ToString();
        var gradoTexto = gradoPicker.SelectedItem?.ToString();

        if (string.IsNullOrEmpty(nivel) || !int.TryParse(gradoTexto, out var grado))
        {
            TurnoInfoLabel.Text = "";
            return;
        }

        // Regla institucional (igual que el sitio web): primaria 1-3 y secundaria 4-5 en la mañana.
        var turno = nivel == "Primaria"
            ? grado <= 3 ? "Mañana" : "Tarde"
            : grado >= 4 ? "Mañana" : "Tarde";

        TurnoInfoLabel.Text = $"Turno estimado para {grado}° de {nivel}: {turno}";
    }

    // ---------- Búsqueda simple ----------

    private async void OnBuscarClicked(object? sender, EventArgs e)
    {
        var nivel = NivelPickerS.SelectedItem?.ToString();
        var grado = GradoPickerS.SelectedItem?.ToString();
        var seccion = SeccionPickerS.SelectedItem?.ToString();

        if (string.IsNullOrEmpty(nivel) && string.IsNullOrEmpty(grado) && string.IsNullOrEmpty(seccion))
        {
            await DisplayAlertAsync("Filtros", "Selecciona al menos nivel, grado o sección para buscar.", "OK");
            return;
        }

        await EjecutarBusquedaAsync(null, seccion, grado, nivel, "Búsqueda simple");
    }

    // ---------- Búsqueda avanzada (en vivo) ----------

    private void OnNombreAvanzadoChanged(object? sender, TextChangedEventArgs e)
    {
        _debounceBusqueda?.Cancel();
        _debounceBusqueda = new CancellationTokenSource();
        var token = _debounceBusqueda.Token;

        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(450, token);
                if (!token.IsCancellationRequested)
                    await MainThread.InvokeOnMainThreadAsync(EjecutarBusquedaAvanzadaAsync);
            }
            catch (TaskCanceledException) { }
        });
    }

    private async Task EjecutarBusquedaAvanzadaAsync()
    {
        var nombre = NombreAvanzadoEntry.Text?.Trim();
        var nivel = NivelPickerA.SelectedItem?.ToString();
        var grado = GradoPickerA.SelectedItem?.ToString();
        var seccion = SeccionPickerA.SelectedItem?.ToString();

        // Sin nombre ni filtros no se busca (evita listar todo).
        if (string.IsNullOrWhiteSpace(nombre) &&
            string.IsNullOrEmpty(nivel) &&
            string.IsNullOrEmpty(grado) &&
            string.IsNullOrEmpty(seccion))
        {
            await AplicarResultadosAsync([], "Escribe un nombre o usa los filtros");
            return;
        }

        await EjecutarBusquedaAsync(nombre, seccion, grado, nivel, "Búsqueda avanzada");
    }

    private async Task EjecutarBusquedaAsync(string? nombre, string? seccion, string? grado, string? nivel, string modo)
    {
        LoadingIndicator.IsVisible = true;
        LoadingIndicator.IsRunning = true;

        try
        {
            var estudiantes = await _dataService.BuscarEstudiantes(nombre, null, seccion, grado, nivel, null);
            var resumen = ResumenDeBusqueda(nombre, nivel, grado, seccion, modo);
            await AplicarResultadosAsync(estudiantes, resumen);
        }
        finally
        {
            LoadingIndicator.IsRunning = false;
            LoadingIndicator.IsVisible = false;
        }
    }

    private static string ResumenDeBusqueda(string? nombre, string? nivel, string? grado, string? seccion, string modo)
    {
        var filtros = new List<string> { modo };

        if (!string.IsNullOrWhiteSpace(nombre)) filtros.Add($"“{nombre}”");
        if (!string.IsNullOrWhiteSpace(nivel)) filtros.Add(nivel);
        if (!string.IsNullOrWhiteSpace(grado)) filtros.Add($"{grado}°");
        if (!string.IsNullOrWhiteSpace(seccion)) filtros.Add(seccion);

        return string.Join(" · ", filtros);
    }

    private async void OnLimpiarClicked(object? sender, EventArgs e)
    {
        // Limpiar ambos paneles
        NivelPickerS.SelectedItem = null;
        GradoPickerS.SelectedItem = null;
        SeccionPickerS.SelectedItem = null;
        NombreAvanzadoEntry.Text = null;
        NivelPickerA.SelectedItem = null;
        GradoPickerA.SelectedItem = null;
        SeccionPickerA.SelectedItem = null;
        TurnoInfoLabel.Text = "";

        await AplicarResultadosAsync([], "Elige un modo de búsqueda");
    }

    private Task AplicarResultadosAsync(List<Estudiante> estudiantes, string resumen)
    {
        _resultados = estudiantes
            .Select(e => new EstudianteViewModel(e, _dataService.YaRegistradoHoy(e.Id)))
            .ToList();

        EstudiantesCollectionView.ItemsSource = _resultados;
        ResumenLabel.Text = resumen;
        ConteoLabel.Text = _resultados.Count.ToString(CultureInfo.InvariantCulture);
        ActualizarIndicadores();

        return Task.CompletedTask;
    }

    private void ActualizarIndicadores()
    {
        var presentes = _resultados.Count(r => r.YaRegistrado);

        TotalLabel.Text = _resultados.Count.ToString(CultureInfo.InvariantCulture);
        RegistradosLabel.Text = presentes.ToString(CultureInfo.InvariantCulture);
        PendientesLabel.Text = (_resultados.Count - presentes).ToString(CultureInfo.InvariantCulture);
    }

    private async void OnEscanerarQRClicked(object? sender, EventArgs e)
    {
        try
        {
            var paginaLector = new ScanPage();
            await Navigation.PushAsync(paginaLector);
        }
        catch (Exception ex)
        {
            await DisplayAlertAsync("Error", $"No se pudo acceder a la cámara: {ex.Message}", "OK");
        }
    }

    private void OnRegistrarAsistenciaClicked(object? sender, EventArgs e)
    {
        if (sender is not BindableObject binding || binding.BindingContext is not EstudianteViewModel viewModel)
            return;

        _ = RegistrarAsistenciaAsync(viewModel.Estudiante);
    }

    private async Task RegistrarAsistenciaAsync(Estudiante estudiante)
    {
        var fila = _resultados.FirstOrDefault(r => r.Estudiante.Id == estudiante.Id);

        if (await _dataService.YaRegistradoHoyAsync(estudiante.Id))
        {
            if (fila is not null)
                fila.YaRegistrado = true;

            await DisplayAlertAsync("Ya registrado", $"{estudiante.Nombre} {estudiante.Apellido} tiene asistencia de hoy.", "OK");
            return;
        }

        var guardado = await _dataService.RegistrarAsistencia(new Asistencia
        {
            EstudianteId = estudiante.Id,
            Fecha = DateTime.Now,
            Estado = "Presente",
            MetodoRegistro = "Manual",
            Observaciones = "Registrado desde app móvil"
        });

        if (!guardado)
        {
            if (fila is not null)
                fila.YaRegistrado = true;

            await DisplayAlertAsync("Ya registrado", $"{estudiante.Nombre} {estudiante.Apellido} tiene asistencia de hoy.", "OK");
            return;
        }

        if (fila is not null)
            fila.YaRegistrado = true;

        ActualizarIndicadores();

        await DisplayAlertAsync(
            "Asistencia registrada",
            $"{estudiante.Nombre} {estudiante.Apellido}\n{DateTime.Now:HH:mm}",
            "OK");
    }

    private async void OnSalirClicked(object? sender, EventArgs e)
    {
        var confirmar = await DisplayAlertAsync("Cerrar sesión", "¿Deseas cerrar la sesión actual?", "Sí, salir", "Cancelar");

        if (confirmar)
        {
            SesionFirebase.Limpiar();
            await Navigation.PopToRootAsync();
        }
    }
}

public class EstudianteViewModel(Estudiante estudiante, bool yaRegistrado) : INotifyPropertyChanged
{
    private bool _yaRegistrado = yaRegistrado;

    public Estudiante Estudiante { get; } = estudiante;

    public string NombreCompleto => $"{Estudiante.Nombre} {Estudiante.Apellido}";

    public string InfoClase
    {
        get
        {
            var partes = new List<string>();

            if (!string.IsNullOrWhiteSpace(Estudiante.Nivel))
                partes.Add(Estudiante.Nivel);

            if (Estudiante.Grado > 0)
                partes.Add($"{Estudiante.Grado}° {Estudiante.Seccion}".TrimEnd());

            if (!string.IsNullOrWhiteSpace(Estudiante.Turno))
                partes.Add(Estudiante.Turno);

            return partes.Count == 0 ? "Sin datos de clase" : string.Join(" · ", partes);
        }
    }

    public string CodigoLabel => string.IsNullOrWhiteSpace(Estudiante.CodigoQR)
        ? "Sin DNI"
        : $"DNI {Estudiante.CodigoQR}";

    public string Iniciales => InitialsOf($"{Estudiante.Nombre} {Estudiante.Apellido}");

    public bool YaRegistrado
    {
        get => _yaRegistrado;
        set
        {
            if (_yaRegistrado == value)
                return;

            _yaRegistrado = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(RegistrarHabilitado));
        }
    }

    public bool RegistrarHabilitado => !_yaRegistrado;

    private static string InitialsOf(string nombreCompleto)
    {
        var partes = nombreCompleto.Split([' ', '-'], StringSplitOptions.RemoveEmptyEntries);

        return partes.Length switch
        {
            0 => "?",
            1 => partes[0][..1].ToUpperInvariant(),
            _ => $"{char.ToUpperInvariant(partes[0][0])}{char.ToUpperInvariant(partes[^1][0])}"
        };
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    private void OnPropertyChanged([CallerMemberName] string? propertyName = null) =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
}
