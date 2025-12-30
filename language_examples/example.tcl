if { [expr {$input > 10}] } {
  puts $input is greater than 10!
}
regexp {#} "Test string"
puts "Ruined formatting"