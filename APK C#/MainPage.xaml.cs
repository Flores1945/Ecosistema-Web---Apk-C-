using System.Threading.Tasks;
using MiAppAsistencia.Models;
using MiAppAsistencia.Services;
using MiAppAsistencia.Views;

namespace MiAppAsistencia;

public partial class MainPage : ContentPage
{
    private readonly Usuario _usuario;
    private readonly DataService _dataService;

    public MainPage(Usuario usuario)
    {
        InitializeComponent();
        _usuario = usuario;
        _dataService = new DataService();

        UsuarioLabel.Text = $"Bienvenido, {_usuario.Nombre} ({_usuario.Rol})";

        // Configurar eventos automáticos
        NivelPicker.SelectedIndexChanged += OnNivelChanged;
        GradoPicker.SelectedIndexChanged += OnGradoChanged;

        CargarTodosEstudiantes();
    }

    private void OnNivelChanged(object? sender, EventArgs e)
    {
        var nivel = NivelPicker.SelectedItem?.ToString();
        
        // Limpiar y configurar grados según nivel
        GradoPicker.SelectedItem = null;
        
        if (nivel == "Primaria")
        {
            // Primaria: grados 1-6
            GradoPicker.Items.Clear();
            GradoPicker.Items.Add("");
            for (int i = 1; i <= 6; i++)
            {
                GradoPicker.Items.Add(i.ToString());
            }
        }
        else if (nivel == "Secundaria")
        {
            // Secundaria: grados 1-5
            GradoPicker.Items.Clear();
            GradoPicker.Items.Add("");
            for (int i = 1; i <= 5; i++)
            {
                GradoPicker.Items.Add(i.ToString());
            }
        }
        else
        {
            // Resetear
            GradoPicker.Items.Clear();
            GradoPicker.Items.Add("");
            GradoPicker.Items.Add("1");
            GradoPicker.Items.Add("2");
            GradoPicker.Items.Add("3");
            GradoPicker.Items.Add("4");
            GradoPicker.Items.Add("5");
            GradoPicker.Items.Add("6");
        }
        
        TurnoPicker.SelectedItem = null;
    }

    private void OnGradoChanged(object? sender, EventArgs e)
    {
        var nivel = NivelPicker.SelectedItem?.ToString();
        var gradoStr = GradoPicker.SelectedItem?.ToString();
        
        if (string.IsNullOrEmpty(nivel) || string.IsNullOrEmpty(gradoStr))
        {
            TurnoPicker.SelectedItem = null;
            return;
        }
        
        if (!int.TryParse(gradoStr, out int grado))
        {
            TurnoPicker.SelectedItem = null;
            return;
        }
        
        // Lógica automática de turno (igual que en la web)
        // Primaria 1,2,3 + Secundaria 4,5 = Mañana
        // Primaria 4,5,6 + Secundaria 1,2,3 = Tarde
        string turno;
        
        if (nivel == "Primaria")
        {
            turno = grado <= 3 ? "Mañana" : "Tarde";
        }
        else // Secundaria
        {
            turno = grado >= 4 ? "Mañana" : "Tarde";
        }
        
        TurnoPicker.SelectedItem = turno;
    }

    private async void CargarTodosEstudiantes()
    {
        try
        {
            var estudiantes = await _dataService.ObtenerTodosEstudiantes();
            EstudiantesCollectionView.ItemsSource = estudiantes.Select(e => new EstudianteViewModel(e)).ToList();
            
            // Mostrar total de estudiantes
            UsuarioLabel.Text = $"Bienvenido, {_usuario.Nombre} ({_usuario.Rol}) - Total estudiantes: {estudiantes.Count}";
        }
        catch (Exception ex)
        {
            await DisplayAlert("Error", $"No se pudieron cargar los estudiantes: {ex.Message}\nAsegúrate que el backend esté encendido en 192.168.100.8:3000", "OK");
        }
    }

    private async void OnBuscarClicked(object? sender, EventArgs e)
    {
        var nombre = NombreEntry.Text?.Trim();
        var nivel = NivelPicker.SelectedItem?.ToString();
        var turno = TurnoPicker.SelectedItem?.ToString();
        var grado = GradoPicker.SelectedItem?.ToString();
        var seccion = SeccionPicker.SelectedItem?.ToString();

        var estudiantes = await _dataService.BuscarEstudiantes(nombre, null, seccion, grado, nivel, turno);
        EstudiantesCollectionView.ItemsSource = estudiantes.Select(e => new EstudianteViewModel(e)).ToList();
    }

    private async void OnEscanerarQRClicked(object? sender, EventArgs e)
    {
        try
        {
            var cameraBarcodeReaderPage = new CameraBarcodeReaderPage();
            cameraBarcodeReaderPage.OnDetected += async (result) =>
            {
                await MainThread.InvokeOnMainThreadAsync(async () =>
                {
                    await Navigation.PopAsync();
                    await ProcesarCodigoQR(result);
                });
            };

            await Navigation.PushAsync(cameraBarcodeReaderPage);
        }
        catch (Exception ex)
        {
            await DisplayAlert("Error", $"No se pudo acceder a la cámara: {ex.Message}", "OK");
        }
    }

    private async Task ProcesarCodigoQR(string codigoQR)
    {
        var estudiante = await _dataService.ObtenerEstudiantePorCodigoQR(codigoQR);

        if (estudiante != null)
        {
            await RegistrarAsistencia(estudiante);
        }
        else
        {
            await DisplayAlert("No encontrado", $"No se encontró ningún estudiante con el código QR: {codigoQR}", "OK");
        }
    }

    private void OnRegistrarAsistenciaClicked(object? sender, EventArgs e)
    {
        if (sender is Button button && button.CommandParameter is EstudianteViewModel viewModel)
        {
            _ = RegistrarAsistencia(viewModel.Estudiante);
        }
    }

    private async Task RegistrarAsistencia(Estudiante estudiante)
    {
        if (_dataService.YaRegistradoHoy(estudiante.Id))
        {
            await DisplayAlert("Atención", $"{estudiante.Nombre} {estudiante.Apellido} ya tiene asistencia registrada hoy.", "OK");
            return;
        }

        var asistencia = new Asistencia
        {
            EstudianteId = estudiante.Id,
            Fecha = DateTime.Now,
            Estado = "Presente",
            MetodoRegistro = "Manual",
            Observaciones = "Registrado desde app móvil"
        };

        _dataService.RegistrarAsistencia(asistencia);

        await DisplayAlert("Éxito", $"Asistencia registrada para {estudiante.Nombre} {estudiante.Apellido}", "OK");
    }

    private async void OnSalirClicked(object? sender, EventArgs e)
    {
        bool confirmar = await DisplayAlert("Cerrar Sesión", "¿Estás seguro de que deseas cerrar sesión?", "Sí", "No");

        if (confirmar)
        {
            await Navigation.PopToRootAsync();
        }
    }
}

public class EstudianteViewModel
{
    public Estudiante Estudiante { get; }
    public string NombreCompleto => $"{Estudiante.Nombre} {Estudiante.Apellido}";
    public string InfoClase => $"{Estudiante.Nivel} - {Estudiante.Grado}° {Estudiante.Seccion} ({Estudiante.Turno})";
    public string CodigoQR => Estudiante.CodigoQR;

    public EstudianteViewModel(Estudiante estudiante)
    {
        Estudiante = estudiante;
    }
}
