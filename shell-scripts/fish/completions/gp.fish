function __gp_needs_project --description 'Test if there is no project given yet'
  set cmd (commandline -opc)
  if [ (count $cmd) -eq 1 ]
    return 0
  end
  return 1
end

function __gp_get_projects --description 'Get a list of all projects'
  pdm get-list
end

complete -f -c gp -n '__gp_needs_project' -a '(__gp_get_projects)' --description 'Project'
