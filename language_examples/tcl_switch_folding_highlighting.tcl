# Repro for issue #555: Tcl folding and switch highlighting.

if {$a == 1} {
    puts "a"
} else {
    puts "b"
}

switch $state {
    run {
        puts "run"
    }
    stop {
        if {$debug} {
            puts "stop/debug"
        }
    }
    default {
        puts "unknown"
    }
}

switch -glob -- $state {
    r* {
        puts "run-like"
    }
    default {
        puts "unknown"
    }
}

switch $state run {
    puts "run"
} default {
    puts "unknown"
}

puts "highlighting should recover here"
