param(
  [string]$BaseUrl = "http://localhost:5115",
  [int]$EmployeesToCreate = 500,
  [int]$AttendanceToCreate = 250,
  [int]$VacationsToCreate = 125,
  [int]$LeavesToCreate = 125,
  [int]$DelayMs = 550
)

$ErrorActionPreference = "Stop"

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    [hashtable]$Headers,
    [object]$Body = $null,
    [int]$MaxRetries = 6
  )

  $attempt = 0
  while ($true) {
    try {
      if ($null -eq $Body) {
        return Invoke-RestMethod -Method $Method -Uri "$BaseUrl$Path" -Headers $Headers -TimeoutSec 60
      }

      $json = $Body | ConvertTo-Json -Depth 8
      return Invoke-RestMethod -Method $Method -Uri "$BaseUrl$Path" -Headers $Headers -ContentType "application/json" -Body $json -TimeoutSec 60
    } catch {
      $status = $null
      if ($_.Exception.Response) {
        try { $status = [int]$_.Exception.Response.StatusCode } catch { $status = $null }
      }

      $attempt++
      if ($attempt -ge $MaxRetries -or ($status -ne 429 -and $status -ne 502 -and $status -ne 503 -and $status -ne 504)) {
        throw
      }

      Start-Sleep -Milliseconds ([Math]::Min(3000, 350 * $attempt))
    }
  }
}

Write-Host "Login..."
$loginPayload = @{
  userNameOrEmail = "admin"
  password = "Admin123!"
}
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/auth/login" -ContentType "application/json" -Body ($loginPayload | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($login.accessToken)" }

Write-Host "Fetching catalogs..."
$employeeCatalogs = Invoke-Api -Method Get -Path "/api/v1/employees/catalogs" -Headers $headers
$leaveCatalogs = Invoke-Api -Method Get -Path "/api/v1/leaves/catalogs" -Headers $headers
$employeesPage = Invoke-Api -Method Get -Path "/api/v1/employees?page=1&pageSize=1" -Headers $headers
$serialBase = ([int]$employeesPage.totalCount) + 10000

if (-not $employeeCatalogs.branches.Count -or -not $employeeCatalogs.areas.Count -or -not $employeeCatalogs.positions.Count -or -not $employeeCatalogs.contractTypes.Count) {
  throw "Catalogs are incomplete. Cannot generate seed data."
}

$leaveTypes = @($leaveCatalogs.leaveTypes | ForEach-Object { $_.code })
if (-not $leaveTypes.Count) {
  $leaveTypes = @("personal")
}

$createdEmployees = New-Object System.Collections.Generic.List[object]
$employeesInserted = 0
$createdAttendance = 0
$createdVacations = 0
$createdLeaves = 0
$employeeErrors = 0
$attendanceErrors = 0
$vacationErrors = 0
$leaveErrors = 0

Write-Host "Creating employees ($EmployeesToCreate)..."
for ($i = 1; $i -le $EmployeesToCreate; $i++) {
  try {
    $branch = $employeeCatalogs.branches[($i - 1) % $employeeCatalogs.branches.Count]
    $area = $employeeCatalogs.areas[($i - 1) % $employeeCatalogs.areas.Count]
    $position = $employeeCatalogs.positions[($i - 1) % $employeeCatalogs.positions.Count]
    $contract = $employeeCatalogs.contractTypes[($i - 1) % $employeeCatalogs.contractTypes.Count]

    $serial = $serialBase + $i
    $docNumber = (($serial % 99999999) + 10000000).ToString("00000000")
    $employeeCode = ("EMP{0:00000}" -f $serial)
    $hireDate = (Get-Date "2022-01-03").AddDays(($i % 900)).ToString("yyyy-MM-dd")
    $birthDate = (Get-Date "1987-01-15").AddDays(($i % 7000)).ToString("yyyy-MM-dd")

    $bankAccountCci = ("002193" + $i.ToString("00000000000000")).Substring(0, 20)

    $payload = @{
      employeeCode = $employeeCode
      firstName = "Empleado$i"
      lastName = "Prueba$i"
      documentType = "DNI"
      documentNumber = $docNumber
      birthDate = $birthDate
      hireDate = $hireDate
      baseSalary = [Math]::Round((1500 + ($i % 18) * 175), 2)
      personalEmail = "empleado$serial.personal@test.local"
      workEmail = "empleado$serial@empresa.local"
      phoneNumber = "9{0:00000000}" -f (($i % 99999999) + 1)
      profilePhotoUrl = $null
      notes = "Seed test data batch"
      emergencyContactName = "Contacto $i"
      emergencyContactPhone = "9{0:00000000}" -f (((70000000 + $i) % 99999999) + 1)
      contractEndDate = $null
      bankName = "BCP"
      bankAccountNumber = ("193{0:0000000000}" -f $i)
      bankAccountCci = $bankAccountCci
      bankAccountType = "savings"
      bankCurrency = "PEN"
      branchId = $branch.id
      areaId = $area.id
      positionId = $position.id
      contractTypeId = $contract.id
      managerId = $null
    }

    $created = Invoke-Api -Method Post -Path "/api/v1/employees" -Headers $headers -Body $payload
    $createdEmployees.Add($created) | Out-Null
    $employeesInserted++
  } catch {
    $employeeErrors++
  }

  Start-Sleep -Milliseconds $DelayMs
}

if (-not $createdEmployees.Count) {
  $existingEmployeesPage = Invoke-Api -Method Get -Path "/api/v1/employees?page=1&pageSize=1000" -Headers $headers
  foreach ($item in $existingEmployeesPage.items) {
    $createdEmployees.Add($item) | Out-Null
  }
}

if (-not $createdEmployees.Count) {
  throw "No employees available for dependent seed steps."
}

Write-Host "Creating attendance absences ($AttendanceToCreate)..."
for ($i = 0; $i -lt $AttendanceToCreate; $i++) {
  try {
    $emp = $createdEmployees[$i % $createdEmployees.Count]
    $date = (Get-Date "2025-03-03").AddDays($i % 40)
    $day = $date.DayOfWeek.value__
    if ($day -eq 0 -or $day -eq 6) { $date = $date.AddDays(1) }

    $payload = @{
      employeeId = $emp.id
      attendanceDate = $date.ToString("yyyy-MM-dd")
      reason = "Seed absence"
    }

    [void](Invoke-Api -Method Post -Path "/api/v1/attendance/mark-absent" -Headers $headers -Body $payload)
    $createdAttendance++
  } catch {
    $attendanceErrors++
  }

  Start-Sleep -Milliseconds $DelayMs
}

Write-Host "Creating vacations ($VacationsToCreate)..."
for ($i = 0; $i -lt $VacationsToCreate; $i++) {
  try {
    $emp = $createdEmployees[$i % $createdEmployees.Count]
    $start = (Get-Date "2026-05-05").AddDays($i * 2)
    while ($start.DayOfWeek -eq "Saturday" -or $start.DayOfWeek -eq "Sunday") {
      $start = $start.AddDays(1)
    }
    $end = $start.AddDays(2)

    $payload = @{
      employeeId = $emp.id
      startDate = $start.ToString("yyyy-MM-dd")
      endDate = $end.ToString("yyyy-MM-dd")
      reason = "Seed vacation"
    }

    [void](Invoke-Api -Method Post -Path "/api/v1/vacations" -Headers $headers -Body $payload)
    $createdVacations++
  } catch {
    $vacationErrors++
  }

  Start-Sleep -Milliseconds $DelayMs
}

Write-Host "Creating leaves ($LeavesToCreate)..."
for ($i = 0; $i -lt $LeavesToCreate; $i++) {
  try {
    $emp = $createdEmployees[($i + 130) % $createdEmployees.Count]
    $start = (Get-Date "2026-07-01").AddDays($i * 2)
    while ($start.DayOfWeek -eq "Saturday" -or $start.DayOfWeek -eq "Sunday") {
      $start = $start.AddDays(1)
    }
    $end = $start.AddDays(1)
    $leaveType = $leaveTypes[$i % $leaveTypes.Count]

    $payload = @{
      employeeId = $emp.id
      leaveType = $leaveType
      startDate = $start.ToString("yyyy-MM-dd")
      endDate = $end.ToString("yyyy-MM-dd")
      isPaid = $true
      reason = "Seed leave"
    }

    [void](Invoke-Api -Method Post -Path "/api/v1/leaves" -Headers $headers -Body $payload)
    $createdLeaves++
  } catch {
    $leaveErrors++
  }

  Start-Sleep -Milliseconds $DelayMs
}

$totalCreated = $createdEmployees.Count + $createdAttendance + $createdVacations + $createdLeaves

Write-Host ""
Write-Host "Seed finished"
Write-Host "Employees created: $employeesInserted (errors: $employeeErrors)"
Write-Host "Attendance created: $createdAttendance (errors: $attendanceErrors)"
Write-Host "Vacations created: $createdVacations (errors: $vacationErrors)"
Write-Host "Leaves created: $createdLeaves (errors: $leaveErrors)"
Write-Host "Total records created: $($employeesInserted + $createdAttendance + $createdVacations + $createdLeaves)"
