function gp
  set -lx FORCE_COLOR 1
  set path (pdm get-path $argv)
  if [ $status -eq 0 ]
    cd $path
  end
end
