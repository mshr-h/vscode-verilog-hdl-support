if { [expr {$input > 10}] } {
  puts $input is greater than 10!
}

# Top-level comment
puts "hello"; # command separator comment

regexp {#} "Test string"
puts "Still highlighted normally"

regexp {^#.*$} $line
puts "Still highlighted after regexp"

if {1} {
  # Script-body comment
  puts "ok"
}

switch -regexp -- $line {
  ^#.*$ {
    # Switch body comment
    puts "matched"
  }
}
