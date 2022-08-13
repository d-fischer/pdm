__gp_get_projects() {
	if [ "${#COMP_WORDS[@]}" -ne 2 ]; then
		return
	fi

	local iter
	local completions=()
	local oldIFS="$IFS"

	IFS=$'\n'
	for iter in $(pdm get-list); do
		if [[ "$iter" == *"${COMP_WORDS[1]}"* ]]; then
			completions+=("$iter")
		fi
	done

	COMPREPLY=("${completions[@]}")
	IFS="$oldIFS"
}

complete -F __gp_get_projects gp
